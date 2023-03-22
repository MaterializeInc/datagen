# End-to-end Ecommerce Tutorial with Materialize

In this tutorial, we will generate relational data about `users`, `purchases`, and `items`. Users make purchases, and purchases have items. At the end, we might like to retrieve a purchase history for a specific user by querying a streaming database.

## Study the Input Schema

Here is the input schema:

```json
[
    {
        "_meta": {
            "topic": "users",
            "key": "id",
            "relationships": [
                {
                    "topic": "purchases",
                    "parent_field": "id",
                    "child_field": "user_id",
                    "records_per": 4
                }
            ]
        },
        "id": "faker.datatype.number(1000)",
        "name": "faker.internet.userName()",
        "email": "faker.internet.exampleEmail()",
        "city": "faker.address.city()",
        "state": "faker.address.state()",
        "zipcode": "faker.address.zipCode()"
    },
    {
        "_meta": {
            "topic": "purchases",
            "key": "id",
            "relationships": [
                {
                    "topic": "items",
                    "parent_field": "item_ids",
                    "child_field": "id"
                }
            ]
        },
        "id": "faker.datatype.uuid()",
        "user_id": "this string can be anything since this field is determined by user.id",
        "item_ids": "faker.helpers.uniqueArray((()=>{return Math.floor(Math.random()*5000);}), Math.floor(Math.random()*4+1))",
        "total": "faker.commerce.price(25, 2500)"
    },
    {
        "_meta": {
            "topic": "items",
            "key": "id"
        },
        "id": "this string can be anything since this field is determined by purchases.item_ids",
        "name": "faker.commerce.product()",
        "price": "faker.commerce.price(5, 500)",
        "description": "faker.commerce.productDescription()",
        "material": "faker.commerce.productMaterial()"
    }
]
```

On each iteration of `datagen`:
1. A user is created, then
1. Four purchases are created that are associated with that user, and then
1. Up to five items are created for each purchase so that each item ID in the purchase's `item_ids` array is used as an `id` in the `items` dataset.

Here are a couple of important ideas to note:
- The file is a list of datasets
- Each dataset has a `_meta` object that specifies the key, Kafka topic, and a list of relationships
  - Each relationship specifies the topic, parent field, matching child field, and how many child records should be produced for each parent record
    - If the parent field is an array, the size of the array determines how many child record are produced
- Each dataset has several fields, where field name is mapped to a [FakerJS API](https://fakerjs.dev/api/) method.
- The primary keys for `users` and `items` use `faker.datatype.number`
  - In effect, this limits the key space for these datasets.
  - For example, user ID is specified with `datatype.number(1000)`, which means there will be a maximum of 1000 unique users, and if a new user is produced with the same ID, it will be interpreted as an update in the downstream database (more on Materialize's `UPSERT` envelope later).
- Notice `purchases.item_ids` uses `faker.helpers.uniqueArray` and some Javascript functions to build an array. This is cool and fun, but just make sure you carefully inspect your input schema file since `datagen` will execute some Javascript

> :warning: Repeat -- please inspect your input schema file since `faker` methods can contain arbitrary Javascript functions that `datagen` will execute.

## Set up infrastructure

This tutorial will use a Confluent Cloud Basic Kafka Cluster and Schema Registry as a target for `datagen`, and Materialize as the streaming database for queries.

### Confluent Cloud

1. Create an account on [Confluent Cloud](confluent.cloud).
1. Create a basic cluster in AWS `us-east-1` or `eu-west-1`.
1. Create an API key / secret for your cluster and keep safe in a password manager.
1. Enable Schema Registry.
1. Create an API key / secret for Schema Registry and keep safe in a password manager.

### Datagen

1. [Install datagen](../../README.md#installation) if you haven't already.
1. Create a `.env` file with your Kafka and Schema Registry credentials (see [.env.example](../../.env.example)).
1. Generate a single iteration of records with dry run and debug modes and check the output. You will see the Avro schemas that will be registered with Schema Registry, along with a single iteration's worth of records. You will see one user created, 4 purchases, and up to 5 items.
    ```bash
    datagen \
        --schema examples/ecommerce/ecommerce.json \
        --format avro \
        --number 1 \
        --prefix mz_datagen_ecommerce \
        --dry-run \
        --debug
    ```
1. Start producing data to Kafka while you set up Materialize.
    ```bash
    datagen \
        -s examples/ecommerce/ecommerce.json \
        -f avro \
        -n -1 \
        -p mz_datagen_ecommerce \
        --wait 500
    ```

### Materialize

Materialize is a [streaming database](https://materialize.com/guides/streaming-database/). You create materialized views with standard SQL and Materialize will eagerly read from Kafka topics and Postgres tables and keep your materialized views up to date automatically in response to new data. It's Postgres wire compatible, so you can read your materialized views directly with the `psql` CLI or any Postgres client library.

1. [Register for access](https://materialize.com/register/) to Materialize.
1. Enable your region.
1. In a separate terminal session, [install `psql`](https://materialize.com/docs/integrations/sql-clients/#psql).
1. Log into [Materialize](cloud.materialize.com) and create an app password. Save it in your password manager.
1. Connect to the database via `psql` with the connection string provided.
1. Create a `SECRET` called `confluent_kafka_password` that is your Kafka cluster API secret.
    ```sql
    CREATE SECRET confluent_kafka_username AS '<your kafka api key>';
    CREATE SECRET confluent_kafka_password AS '<your kafka api secret>';
    ```
1. Create a `SECRET` called `csr_password` that is your Confluent Schema Registry API secret.
    ```sql
    CREATE SECRET csr_username AS '<your csr api key>';
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
                SASL USERNAME = SECRET confluent_kafka_username,
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
                USERNAME = SECRET csr_username,
                PASSWORD = SECRET csr_password
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
1. Create `UPSERT` sources for `users`, `purchases`, and `items`.
    ```sql
    CREATE SOURCE users
        IN CLUSTER sources 
        FROM KAFKA CONNECTION confluent_kafka
        (TOPIC 'mz_datagen_ecommerce_users')
        KEY FORMAT BYTES
        VALUE FORMAT AVRO
        USING CONFLUENT SCHEMA REGISTRY CONNECTION csr
        INCLUDE TIMESTAMP AS ts
        ENVELOPE UPSERT;
    ```
    ```sql
    CREATE SOURCE purchases
        IN CLUSTER sources 
        FROM KAFKA CONNECTION confluent_kafka
        (TOPIC 'mz_datagen_ecommerce_purchases')
        KEY FORMAT BYTES
        VALUE FORMAT AVRO
        USING CONFLUENT SCHEMA REGISTRY CONNECTION csr
        INCLUDE TIMESTAMP AS ts
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
        INCLUDE TIMESTAMP AS ts
        ENVELOPE UPSERT;
    ```
    > :notebook: [`UPSERT` envelope](https://materialize.com/docs/sql/create-sink/#upsert-envelope) means that Kafka records of the same key will be interpreted as inserts (key doesn't exist yet), updates (key already exists), or deletes (`null` payload, a.k.a. tombstone).

## Query the Results

Materialize specializes in efficient, incremental view maintenance over changing input data. Let's see it in action by computing purchase histories with joins and aggregations!

1. Connect to Materialize with `psql` using your connection string and app password.
1. Use the `ecommerce` cluster.
    ```sql
    SET CLUSTER = ecommerce;
    ```
1. Create some views related to recent purchase history for each user.
    ```sql
    -- create a view of items that were apart of purchases in the last minute
    CREATE VIEW
        purchases_items_last_min
        AS
            SELECT id, user_id, unnest(item_ids) AS item_id, ts
            FROM purchases
            WHERE
                mz_now() >= ts
                    AND
                mz_now() <= ts + INTERVAL '1m';

    -- create indexes for the join columns of the next view.
    CREATE INDEX ON purchases_items_last_min (item_id);
    CREATE INDEX ON items (id);

    -- enrich the previous view with item description and item material
    CREATE VIEW
        purchases_items_last_min_enriched
        AS
            SELECT
                p.id,
                p.user_id,
                p.item_id,
                i.material,
                i.description,
                p.ts
            FROM
                purchases_items_last_min AS p
                    JOIN items AS i ON p.item_id = i.id;

    -- create indexes on join columns for the next view
    CREATE INDEX ON purchases (user_id);
    CREATE INDEX ON users (id);

    -- calculate the sum of purchases over the last minute for each user
    CREATE VIEW
        purchases_total_last_min
        AS
            SELECT
                u.id AS user_id,
                list_agg(p.id) AS purchase_ids,
                SUM(CAST(p.total AS numeric)) AS total_last_min
            FROM
                users AS u
                    JOIN purchases AS p ON u.id = p.user_id
            WHERE
                mz_now() >= p.ts
                    AND
                mz_now() <= p.ts + INTERVAL '1m'
            GROUP BY u.id;

    -- create index on join column for the next view
    CREATE INDEX ON purchases_items_last_min_enriched (user_id);

    -- create a view that includes user email, items, materials, and total spend 
    -- for each user over the last minute
    CREATE VIEW
        items_and_total_last_min
        AS
            SELECT
                pi.user_id,
                u.email,
                pt.total_last_min,
                list_agg(pi.item_id) AS item_ids,
                list_agg(pi.material) AS materials
            FROM
                purchases_items_last_min_enriched AS pi
                    JOIN
                        purchases_total_last_min AS pt
                        ON pi.user_id = pt.user_id
                    JOIN users AS u ON pi.user_id = u.id
            GROUP BY 1, 2, 3;

    -- create index to compute the results and load them into memory
    -- for efficient point lookups by email
    CREATE INDEX ON items_and_total_last_min (email);
    ```
1. Look up the purchase history for various user emails.
    ```sql
    SELECT * FROM items_and_total_last_min WHERE email LIKE '%example.net';
    ```
    ```
    -[ RECORD 1 ]--+---------------------------------------------------------------------------------------------------------------------
    user_id        | 955
    email          | Stanford60@example.net
    total_last_min | 5621
    item_ids       | {3590,3392,1888,2656,3436,417,458,463,752,4080}
    materials      | {Fresh,Fresh,Steel,Steel,Steel,Bronze,Frozen,Rubber,Wooden,Plastic}
    -[ RECORD 2 ]--+---------------------------------------------------------------------------------------------------------------------
    user_id        | 213
    email          | Emilia.Kuhlman@example.net
    total_last_min | 5168
    item_ids       | {3090,2329,4639,1330,3403,3664,84,3985,4500,4269,766}
    materials      | {Soft,Fresh,Steel,Bronze,Bronze,Cotton,Cotton,Wooden,Plastic,Plastic,Plastic}
    ...
    ```
    > :bulb: Notice how the results are non empty! If we were generating random records, these joins would be empty because there would likely be no matches on the join conditions.
1. Subscribe to changes in recent purchase history in near-real time. Press `Ctrl+C` to quit.
    ```sql
    COPY (SUBSCRIBE (SELECT * FROM items_and_total_last_min)) TO STDOUT;
    ```
    ```
    time | diff | user_id | email | total_last_min | item_ids | materials
    1679429934200   1       596     Talon.Ondricka@example.com      3198    {2870,2491,2752,3049,2032,4596} {Fresh,Steel,Rubber,Rubber,Granite,Concrete}
    1679429934200   -1      596     Talon.Ondricka@example.com      4112    {2870,3386,2491,2752,3049,2032,4596}    {Soft,Fresh,Steel,Rubber,Rubber,Granite,Concrete}
    1679429934326   1       596     Talon.Ondricka@example.com      973     {2870,3049,4596}        {Steel,Rubber,Concrete}
    1679429934326   -1      596     Talon.Ondricka@example.com      3198    {2870,2491,2752,3049,2032,4596} {Fresh,Steel,Rubber,Rubber,Granite,Concrete}
    1679429934441   -1      596     Talon.Ondricka@example.com      973     {2870,3049,4596}        {Steel,Rubber,Concrete}
    1679429935000   1       346     Chaz_Zboncak83@example.com      991     {571,1421,2730,3310}    {Fresh,Cotton,Rubber,Plastic}
    1679429935000   -1      269     Keon.Schumm@example.net 6747    {4,3101,2846,1067,4170,4940,4437,2430,898,4272,1494}    {Soft,Fresh,Steel,Bronze,Bronze,Bronze,Cotton,Cotton,Rubber,Wooden,Wooden}
    1679429935000   1       269     Keon.Schumm@example.net 6747    {4,3101,2846,1067,4170,4940,4437,2430,898,4272,1494}    {Soft,Bronze,Cotton,Frozen,Frozen,Rubber,Wooden,Wooden,Plastic,Plastic,Plastic}
    ...and so on
    ```
    > :bulb: What's really cool about this is the calculated total is fully consistent with the list of items at all times even though they come from different views. Yay for consistency!

    > :bulb: We see diffs of +1 and -1 as purchases exit the 1 minute window and as users make new purchases. There will also be automatic updates if the user changes their email address. Your views are always up to date in response to newly arriving data.

## Clean up

1. Quit your `datagen` with `Ctrl-C`.
1. Connect again to Materialize via `psql` and drop your `sources` and `ecommerce` clusters.
    ```sql
    DROP CLUSTER sources CASCADE;
    DROP CLUSTER ecommerce CASCADE;
    ```
1. Run `datagen` again with the `--clean` option to destroy topics and schema subjects.
    ```bash
    datagen \
        -s ecommerce.json \
        -f avro \
        -p mz_datagen_ecommerce \
        --clean
    ```

## Learn More

Check out the Materialize [docs](www.materialize.com/docs) and [blog](www.materialize.com/blog) for more!
