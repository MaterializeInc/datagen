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
        "created_at": "date.recent"
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
        "created_at": "date.recent"
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
- The primary keys use `faker.datatype(<number>)`
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
        -n -1
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
1. Quit your `psql` session with `Ctrl+D` or `\q` and run a small loop in your terminal to create a sources for `users` and `items`.
    ```bash
    for i in \
        mz_datagen_ecommerce_users \
        mz_datagen_ecommerce_purchases \
        mz_datagen_ecommerce_items; do
    echo "CREATE SOURCE ${i#mz_datagen_ecommerce}
    IN CLUSTER sources 
    FROM KAFKA CONNECTION confluent_kafka
    (TOPIC '$i')
    KEY FORMAT BYTES
    VALUE FORMAT AVRO
    USING CONFLUENT SCHEMA REGISTRY CONNECTION csr
    ENVELOPE UPSERT;" | \
        psql "postgres://<your username>%40<your email domain>:<your app password>@XXX.XXXX.aws.materialize.cloud:6875/materialize?sslmode=require"
    done
    ```
    > :notebook: [`UPSERT` envelope](https://materialize.com/docs/sql/create-sink/#upsert-envelope) means that Kafka records of the same key will be interpreted as inserts (key doesn't exist yet), updates (key already exists), and deletes (`null` payload, a.k.a. tombstone).
1. Connect to Materialize with `psql` again and create a source for `purchases`.
    ```sql
    CREATE SOURCE purchases
    IN CLUSTER sources 
    FROM KAFKA CONNECTION confluent_kafka
    (TOPIC 'mz_datagen_ecommerce_purchases')
    KEY FORMAT BYTES
    VALUE FORMAT AVRO
    USING CONFLUENT SCHEMA REGISTRY CONNECTION csr
    INCLUDE TIMESTAMP AS ts
    ENVELOPE NONE;
    ```
    > :notebook: A source that uses `ENVELOPE NONE` is referred to as an [append-only](https://materialize.com/docs/sql/create-source/#append-only-envelope) source. In this case, we treat all new records as inserts, even though they have the same key. In this case, a single purchase can have multiple rows corresponding to the different items in the purchase.

## Query the Results

Materialize specializes in efficient, incremental view maintenance over changing input data. Let's see it in action by computing purchase histories with joins and aggregations!

1. Connect to Materialize with `psql` using your connection string and app password.
1. Create indexes on the primary keys.
    ```sql
    --
    ```
1.  Explore with an ad-hoc query.
    ```sql
    --
    ```
    > :bulb: Notice how the results are non empty! If we were generating random records, these joins would be empty because there would likely be no matches on the join conditions.
1. Create a view that calculates the purchase history for each user.
    ```sql
    --
    ```
1. Create an index on that view to compute the results and load them into memory for efficient point lookups.
    ```sql
    --
    ```
1. Look up the purchase history for various users.
    ```sql
    --
    ```
1. Subscribe to changes in purchase history.
    ```sql
    --
    ```

## Clean up

1. Quit your `datagen` with `Ctrl-C`.
1. Run `datagen` again with the `--clean` option to destroy topics and schema subjects.
    ```bash
    datagen \
        -s examples/ecommerce.json \
        -f avro \
        --clean
    ```
1. Connect again to Materialize via `psql` and drop your `sources` and `ecommerce` clusters.
    ```sql
    DROP CLUSTER sources CASCADE;
    DROP CLUSTER ecommerce CASCADE;
    ```
1. If you haven't already, drop the cluster replica `default.r1` to avoid accruing idle charges. The default cluster will still exist, and you can create replicas for it whenever you need to compute.
    ```sql
    DROP CLUSTER REPLICA default.r1;
    ```

## Learn More

Check out the Materialize [docs](www.materialize.com/docs) and [blog](www.materialize.com/blog) for more!