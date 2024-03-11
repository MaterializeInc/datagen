# Datagen CLI

This command line interface application allows you to take schemas defined in JSON (`.json`), Avro (`.avsc`), or SQL (`.sql`) and produce believable fake data to Kafka in JSON or Avro format or to Postgres.

The benefits of using this datagen tool are:
- You can specify what values are generated using the expansive [FakerJS API](https://fakerjs.dev/api/) to craft data that more faithfully imitates your use case. This allows you to more easily apply business logic downstream.
- This is a relatively simple CLI tool compared to other Kafka data generators that require Kafka Connect.
- When using the `avro` output format, datagen connects to Schema Registry. This allows you to take advantage of the [benefits](https://www.confluent.io/blog/schema-registry-kafka-stream-processing-yes-virginia-you-really-need-one/) of using Schema Registry.
- Often when you generate random data, your downstream join results won't make sense because it's unlikely a randomly generated field in one dataset will match a randomly generated field in another. With this datagen tool, you can specify relationships between your datasets so that related columns will match up, resulting in meaningful joins downstream. Jump to the [end-to-end ecommerce tutorial](./examples/ecommerce) for a full example.

> :construction: Specifying relationships between datasets currently requires using JSON for the input schema.

> :construction: The `postgres` output format currently does not support specifying relationships between datasets.

## Installation

### npm

```
npm install -g @materializeinc/datagen
```

### Docker

```
docker pull materialize/datagen
```
### From Source


```bash
git clone https://github.com/MaterializeInc/datagen.git
cd datagen
npm install
npm run build
npm link
```

## Setup

Create a file called `.env` with the following environment variables

```bash
# Kafka Brokers
export KAFKA_BROKERS=

# For Kafka SASL Authentication:
export SASL_USERNAME=
export SASL_PASSWORD=
export SASL_MECHANISM=

# For Kafka SSL Authentication:
export SSL_CA_LOCATION=
export SSL_CERT_LOCATION=
export SSL_KEY_LOCATION=

# Connect to Schema Registry if using '--format avro'
export SCHEMA_REGISTRY_URL=
export SCHEMA_REGISTRY_USERNAME=
export SCHEMA_REGISTRY_PASSWORD=

# Postgres
export POSTGRES_HOST=
export POSTGRES_PORT=
export POSTGRES_DB=
export POSTGRES_USER=
export POSTGRES_PASSWORD=

# MySQL
export MYSQL_HOST=
export MYSQL_PORT=
export MYSQL_DB=
export MYSQL_USER=
export MYSQL_PASSWORD=
```

The `datagen` program will read the environment variables from `.env` in the current working directory.
If you are running `datagen` from a different directory, you can first `source /path/to/your/.env` before running the command.


## Usage

```bash
datagen -h
```

```
Usage: datagen [options]

Fake Data Generator

Options:
  -V, --version             output the version number
  -s, --schema <char>       Schema file to use
  -f, --format <char>       The format of the produced data (choices: "json", "avro", "postgres", "webhook", "mysql", default: "json")
  -n, --number <char>       Number of records to generate. For infinite records, use -1 (default: "10")
  -c, --clean               Clean (delete) Kafka topics and schema subjects previously created
  -dr, --dry-run            Dry run (no data will be produced to Kafka)
  -d, --debug               Output extra debugging information
  -w, --wait <int>          Wait time in ms between record production
  -rs, --record-size <int>  Record size in bytes, eg. 1048576 for 1MB
  -p, --prefix <char>       Kafka topic and schema registry prefix
  -h, --help                display help for command
```


## Quick Examples

See example input schema files in [examples](./examples) and [tests](/tests) folders.

### Quickstart

1. Iterate through a schema defined in SQL 10 times, but don't actually interact with Kafka or Schema Registry ("dry run"). Also, see extra output with debug mode.
    ```bash
    datagen \
      --schema tests/products.sql \
      --format avro \
      --dry-run \
      --debug
    ```

1. Same as above, but actually create the schema subjects and Kafka topics, and actually produce the data. There is less output because debug mode is off.
    ```bash
    datagen \
        --schema tests/products.sql \
        --format avro
    ```

1. Same as above, but produce to Kafka continuously. Press `Ctrl+C` to quit.
    ```bash
    datagen \
        -s tests/products.sql \
        -f avro \
        -n -1
    ```

1. If you want to generate a larger payload, you can use the `--record-size` option to specify number of bytes of junk data to add to each record. Here, we generate a 1MB record. So if you have to generate 1GB of data, you run the command with the following options:
    ```bash
    datagen \
        -s tests/products.sql \
        -f avro \
        -n 1000 \
        --record-size 1048576
    ```
    This will add a `recordSizePayload` field to the record with the specified size and will send the record to Kafka.

    > :notebook: The 'Max Message Size' of your Kafka cluster needs to be set to a higher value than 1MB for this to work.

1. Clean (delete) the topics and schema subjects created above
    ```bash
    datagen \
        --schema tests/products.sql \
        --format avro \
        --clean
    ```

### Generate records with sequence numbers

To simulate auto incrementing primary keys, you can use the `iteration.index` variable in the schema.

This is particularly useful when you want to generate a small set of records with sequence of IDs, for example 1000 records with IDs from 1 to 1000:

```json
[
    {
        "_meta": {
            "topic": "mz_datagen_users"
        },
        "id": "iteration.index",
        "name": "faker.internet.userName()",
    }
]
```

Example:

```
datagen \
    -s tests/iterationIndex.json \
    -f json \
    -n 1000 \
    --dry-run
```

### Docker

Call the docker container like you would call the CLI locally, except:
- include `--rm` to remove the container when it exits
- include `-it` (interactive teletype) to see the output as you would locally (e.g. colors)
- mount `.env` and schema files into the container
- note that the working directory in the container is `/app`

```
docker run \
  --rm -it \
  -v ${PWD}/.env:/app/.env \
  -v ${PWD}/tests/schema.json:/app/blah.json \
      materialize/datagen -s blah.json -n 1 --dry-run
```

## Input Schemas

You can define input schemas using JSON (`.json`), Avro (`.avsc`), or SQL (`.sql`). Within those schemas, you use the [FakerJS API](https://fakerjs.dev/api/) to define the data that is generated for each field.

You can pass arguments to `faker` methods by escaping quotes. For example, here is [faker.datatype.number](https://fakerjs.dev/api/datatype.html#number) with `min` and `max` arguments:

```
"faker.datatype.number({min: 100, max: 1000})"
```

> :construction: Right now, JSON is the only kind of input schema that supports generating relational data.

> :warning: Please inspect your input schema file since `faker` methods can contain arbitrary Javascript functions that `datagen` will execute.
### JSON Schema

Here is the general syntax for a JSON input schema:

```json
[
  {
    "_meta": {
      "topic": "<my kafka topic>",
      "key": "<field to be used for kafka record key>" ,
      "relationships": [
        {
          "topic": "<topic for dependent dataset>",
          "parent_field": "<field in this dataset>",
          "child_field": "<matching field in dependent dataset>",
          "records_per": <number of records in dependent dataset per record in this dataset>
        },
        ...
      ]
    },
    "<my first field>": "<method from the faker API>",
    "<my second field>": "<another method from the faker API>",
    ...
  },
  {
    ...
  },
  ...
]
```

Go to the [end-to-end ecommerce tutorial](./examples/ecommerce) to walk through an example that uses a JSON input schema with relational data.


### SQL Schema

The SQL schema option allows you to use a `CREATE TABLE` statement to define what data is generated. You specify the [FakerJS API](https://fakerjs.dev/api/) method using a `COMMENT` on the column. Here is an example:

```sql
CREATE TABLE "ecommerce"."products" (
  "id" int PRIMARY KEY,
  "name" varchar COMMENT 'faker.internet.userName()',
  "merchant_id" int NOT NULL COMMENT 'faker.datatype.number()',
  "price" int COMMENT 'faker.datatype.number()',
  "status" int COMMENT 'faker.datatype.boolean()',
  "created_at" timestamp DEFAULT (now())
);
```

This will produce the desired mock data to the topic `ecommerce.products`.

#### Producing to Postgres

You can also produce the data to a Postgres database. To do this, you need to specify the `-f postgres` option and provide Postgres connection information in the `.env` file. Here is an example `.env` file:

```
# Postgres
export POSTGRES_HOST=
export POSTGRES_PORT=
export POSTGRES_DB=
export POSTGRES_USER=
export POSTGRES_PASSWORD=
```

Then, you can run the following command to produce the data to Postgres:

```bash
datagen \
    -s tests/products.sql \
    -f postgres \
    -n 1000
```

> :warning: You can only produce to Postgres with a SQL schema.

#### Producing to MySQL

You can also produce the data to a MySQL database. To do this, you need to specify the `-f mysql` option and provide MySQL connection information in the `.env` file. Here is an example `.env` file:

```
# MySQL
export MYSQL_HOST=
export MYSQL_PORT=
export MYSQL_DB=
export MYSQL_USER=
export MYSQL_PASSWORD=
```

Then, you can run the following command to produce the data to MySQL:

```bash
datagen \
    -s tests/products.sql \
    -f mysql \
    -n 1000
```

> :warning: You can only produce to MySQL with a SQL schema.

#### Producing to Webhook

You can also produce the data to a Webhook. To do this, you need to specify the `-f webhook` option and provide Webhook connection information in the `.env` file. Here is an example `.env` file:

```
# Webhook
export WEBHOOK_URL=
export WEBHOOK_SECRET=
```

Then, you can run the following command to produce the data to Webhook:

```bash
datagen \
    -s tests/products.sql \
    -f webhook \
    -n 1000
```

> :warning: You can only produce to Webhook with basic authentication.

### Avro Schema

> :construction: Avro input schema currently does not support arbitrary FakerJS methods. Instead, data is randomly generated based on the type.

Here is an example Avro input schema from `tests/schema.avsc` that will produce data to a topic called `products`:

```json
{
  "type": "record",
  "name": "products",
  "namespace": "exp.products.v1",
  "fields": [
    { "name": "id", "type": "string" },
    { "name": "productId", "type": ["null", "string"] },
    { "name": "title", "type": "string" },
    { "name": "price", "type": "int" },
    { "name": "isLimited", "type": "boolean" },
    { "name": "sizes", "type": ["null", "string"], "default": null },
    { "name": "ownerIds", "type": { "type": "array", "items": "string" } }
  ]
}
```
