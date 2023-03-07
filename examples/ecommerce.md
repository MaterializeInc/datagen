# End-to-end Ecommerce Tutorial with Materialize

In this tutorial, we will generate relational data about `users`, `purchases`, and `items`. Users make purchases, and purchases have items. At the end, we might like to retrieve a purchase history for a specific user by querying a streaming database.

## Study the Input Schema

Here is the input schema:

```json
[
    {
        "_meta": {
            "topic": "mz_datagen_ecommerce_users",
            "key": "id",
			"relationships": [
				{
                    "topic": "mz_datagen_ecommerce_purchases",
                    "parent_field": "id",
                    "child_field": "user_id",
                    "records_per": 4
                }
			]
        },
        "id": "datatype.number(100)",
        "name": "internet.userName",
        "email": "internet.exampleEmail",
        "city": "address.city",
        "state": "address.state",
        "zipcode": "address.zipCode",
        "created_at": "date.past(5)"
    },
    {
        "_meta": {
            "topic": "mz_datagen_ecommerce_purchases",
            "key": "id",
			"relationships": [
                {
                    "topic": "mz_datagen_ecommerce_items",
                    "parent_field": "item_id",
                    "child_field": "id",
                    "records_per": 1
                }
			]
        },
        "id": "datatype.number(1000)",
        "user_id": "datatype.number(100)",
        "item_id": "datatype.number(5000)"
    },
    {
        "_meta": {
            "topic": "mz_datagen_ecommerce_items",
            "key": "id"
        },
        "id": "datatype.number(5000)",
        "name": "commerce.product",
        "price": "commerce.price",
        "description": "commerce.productDescription",
        "material": "commerce.productMaterial",
        "created_at": "date.past(5)"
    }
]
```

On each iteration of `datagen`:
1. A user is created, then
1. Four purchases are created that are associated with that user, and then
1. An item is created for each purchase so that the purchase's `item_id` is equal to the `id` for each item associated with it.

Here are a couple of important ideas to note:
- The file is a list of datasets
- Each dataset has a `_meta` object that specifies the key, Kafka topic, and a list of relationships
  - Each relationship specifies the topic, parent field, matching child field, and how many child records should be produced for each parent record
- Each dataset has several fields, where field name is mapped to a [FakerJS API](https://fakerjs.dev/api/) method.
- The primary keys happen to use `faker.datatype(<number>)`
  - In effect, this limits the key space for these records.
  - For example, user ID is specified with `datatype.number(100)`, which means there will be a maximum of 100 unique users, and if a new user is produced with the same ID, it will be interpreted as an update in the downstream database (more on Materialize's `UPSERT` envelope later).
- Since each purchase record has only one item, we will need multiple records with the same purchase ID in order to show all the different items. That means we will need to do some aggregations by purchase ID downstream (more on Materialize's `NONE` envelope, a.k.a. append-only sources later)
- Given the key spaces, it's possible for multiple users to generate different purchase records with the same purchase ID. We can interpret that to mean multiple users can participate in a purchase.

## Set up infrastructure

This tutorial will use a Confluent Cloud Basic Kafka Cluster and Schema Registry as a target for `datagen`, and Materialize as the streaming database for queries.

### Confluent Cloud

1. Create an account on [Confluent Cloud](confluent.cloud).
1. Create a basic cluster in AWS `us-east-1` or `eu-west-1`.
1. Create an API key / secret for your cluster and keep safe in a password manager.
1. Enable Schema Registry.
1. Create an API key / secret for Schema Registry and keep safe in a password manager.

### Datagen

1. [Install datagen](../README.md#installation) if you haven't already.
1. Create a `.env` file with your Kafka and Schema Registry credentials (see [.env.example](../.env.example)).
1. Generate a single iteration of records with dry run and debug modes and check the output.
    ```bash
    datagen \
        --schema examples/ecommerce.json \
        --format avro \
        --number 1 \
        --dry-run \
        --debug
    ```
1. Start producing data to Kafka while you set up Materialize.
    ```bash
    datagen \
        -s examples/ecommerce.json \
        -f avro \
        -n -1 \
        --wait 500
    ```

### Materialize

1. [Register for access](https://materialize.com/register/) to Materialize.
1. Enable your region.
1. In a separate terminal session, [install `psql`](https://materialize.com/docs/integrations/sql-clients/#psql).
1. Log into [Materialize](cloud.materialize.com) and create an app password. Save it in your password manager.
1. Connect to the database via `psql` with the connection string provided.
1. Create a `SECRET` called `confluent_kafka_password` that is your Kafka cluster API secret.
    ```sql
    CREATE SECRET confluent_kafka_password AS '<your kafka api secret>';
    ```
1. Create a `SECRET` called `csr_password` that is your Confluent Schema Registry API secret.
    ```sql
    CREATE SECRET csr_password AS '<your csr api secret>';
    ```
1. Create a `KAFKA` connection called `confluent_kafka`.
    ```sql
    CREATE CONNECTION
        confluent_kafka
        TO
            KAFKA (
                BROKER = 'pkc-XXXX.XXXX.aws.confluent.cloud:9092',
                SASL MECHANISMS = 'PLAIN',
                SASL USERNAME = '<your kafka api key>',
                SASL PASSWORD = SECRET confluent_kafka_password
            );
    ```
1. Create a `CONFLUENT SCHEMA REGISTRY` connection called `csr`.
    ```sql
    CREATE CONNECTION
        csr
        TO
            CONFLUENT SCHEMA REGISTRY (
                URL 'https://psrc-XXXX.XXXX.aws.confluent.cloud',
                USERNAME = '<your csr api key>',
                PASSWORD = SECRET csr
            );
    ```
1. Create a cluster called `sources` where you will run your Kafka sources.
    ```sql
    CREATE CLUSTER
        sources
            REPLICAS (
                r1 (SIZE='3xsmall')
            );
    ```
1. Create a cluster called `ecommerce` where you will run your queries.
    ```sql
    CREATE CLUSTER
        ecommerce
            REPLICAS (
                r1 (SIZE='2xsmall')
            );
    ```
1. Create `UPSERT` sources for `users` and `items`.
    ```sql
    CREATE SOURCE users
        IN CLUSTER sources 
        FROM KAFKA CONNECTION confluent_kafka
        (TOPIC 'mz_datagen_ecommerce_users')
        KEY FORMAT BYTES
        VALUE FORMAT AVRO
        USING CONFLUENT SCHEMA REGISTRY CONNECTION csr
        ENVELOPE UPSERT;
    ```
    ```sql
    CREATE SOURCE items
        IN CLUSTER sources 
        FROM KAFKA CONNECTION confluent_kafka
        (TOPIC 'mz_datagen_ecommerce_items')
        KEY FORMAT BYTES
        VALUE FORMAT AVRO
        USING CONFLUENT SCHEMA REGISTRY CONNECTION csr
        ENVELOPE UPSERT;
    ```
    > :notebook: [`UPSERT` envelope](https://materialize.com/docs/sql/create-sink/#upsert-envelope) means that Kafka records of the same key will be interpreted as inserts (key doesn't exist yet), updates (key already exists), or deletes (`null` payload, a.k.a. tombstone).
1. Create an append-only (`ENVELOPE NONE`) source for `purchases`.
    ```sql
    CREATE SOURCE purchases
        IN CLUSTER sources 
        FROM KAFKA CONNECTION confluent_kafka
        (TOPIC 'mz_datagen_ecommerce_purchases')
        KEY FORMAT BYTES
        VALUE FORMAT AVRO
        USING CONFLUENT SCHEMA REGISTRY CONNECTION csr
        ENVELOPE NONE;
    ```
    > :notebook: A source that uses `ENVELOPE NONE` is referred to as an [append-only](https://materialize.com/docs/sql/create-source/#append-only-envelope) source. In this case, we treat all new records as inserts, even though they have the same key. In this case, a single purchase can have multiple rows corresponding to the different items in the purchase.

## Query the Results

Materialize specializes in efficient, incremental view maintenance over changing input data. Let's see it in action by computing purchase histories with joins and aggregations!

1. Connect to Materialize with `psql` using your connection string and app password.
1. Use the `ecommerce` cluster.
    ```sql
    SET CLUSTER = ecommerce;
    ```
1. Create a bunch of indexes.
    ```sql
    CREATE INDEX "users_idx"  ON "users" ("id");
    CREATE INDEX "items_idx" ON "items" ("id");
    CREATE INDEX "purchases_idx_items" ON "purchases" ("item_id");
    CREATE INDEX "purchases_idx_users" ON "purchases" ("user_id");
    ```
1. Create a view that calculates the purchase history for each user.
    ```sql
    CREATE VIEW
    "purchases_agg"
    AS
        SELECT
            "p"."id",
            "list_agg"("i"."id") AS "item_ids",
            "list_agg"("u"."id") AS "user_ids",
            "sum"("i"."price"::"numeric") AS "total"
            FROM
                "purchases" AS "p"
                JOIN
                "items" AS "i"
                ON "p"."item_id" = "i"."id"
                JOIN
                "users" AS "u"
                ON "p"."user_id" = "u"."id"
            GROUP BY
                "p"."id";
    ```
1. Create an index on that view to compute the results and load them into memory for efficient point lookups.
    ```sql
    CREATE INDEX "purchases_agg_idx_user_ids" ON "purchases_agg" ("user_ids");
    ```
1. Look up the purchase history for various users.
    ```sql
    SELECT * FROM "purchases_agg" WHERE 70 = ANY ("user_ids");
    ```
    > :bulb: Notice how the results are non empty! If we were generating random records, these joins would be empty because there would likely be no matches on the join conditions.
1. Subscribe to changes in purchase history for a particular user in near-real time.
    ```sql
    COPY
        (SUBSCRIBE
            (SELECT
                *
                FROM
                    "purchases_agg"
                WHERE
                    4 = ANY ("user_ids")))
        TO
        STDOUT;
    ```

## Clean up

1. Quit your `datagen` with `Ctrl-C`.
1. Connect again to Materialize via `psql` and drop your `sources` and `ecommerce` clusters.
    ```sql
    DROP CLUSTER sources CASCADE;
    DROP CLUSTER ecommerce CASCADE;
    ```
1. If you haven't already, drop the cluster replica `default.r1` to avoid accruing idle charges. The default cluster will still exist, and you can create replicas for it whenever you need to compute.
    ```sql
    DROP CLUSTER REPLICA default.r1;
    ```
1. Run `datagen` again with the `--clean` option to destroy topics and schema subjects.
    ```bash
    datagen \
        -s examples/ecommerce.json \
        -f avro \
        --clean
    ```

## Learn More

Check out the Materialize [docs](www.materialize.com/docs) and [blog](www.materialize.com/blog) for more!