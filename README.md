# Datagen CLI

### Installation

```bash
npm install
npm link
```

### Usage

```bash
datagen -h
Usage: datagen [options]

Fake Data Generator

Options:
  -V, --version                output the version number
  -f, --format <char>          The format of the produced data (choices: "json", "avro", default: "json")
  -s, --schema <char>          Schema file to use
  -n, --number <char>          Number of records to generate (default: "10", infinite records: "-1")
  -d, --debug <char>            (choices: "true", "false", default: "false")
  -dr, --dry-run <char>        Dry run (no data will be produced (choices: "true", "false", default: "false")
  -rs, --record-size <char>    Record size in bytes, eg. 1048576 for 1MB
  -h, --help                   display help for command
```

### Env variables

To produce records to a Kafka topic, you need to set the following environment variables:

```bash
SASL_USERNAME=
SASL_PASSWORD=
SASL_MECHANISM=
KAFKA_BROKERS=
```

### Examples

```bash
# Generate 10 records in JSON format
datagen -s products.sql -f json -n 10
```

Output:

```
✔  Parsing schema...


✔  Creating Kafka topic...


✔  Producing records...


✔  Record sent to Kafka topic
  {"products":{"id":50720,"name":"white","merchant_id":76809,"price":1170,"status":89517,"created_at":"upset"}}
  ...
```

### JSON Schema

The JSON schema option allows you to define the data that is generated using Faker.js.

```json
[
    {
        "_meta": {
            "topic": "mz_datagen_users"
        },
        "id": "datatype.uuid",
        "name": "internet.userName",
        "email": "internet.exampleEmail",
        "phone": "phone.imei",
        "website": "internet.domainName",
        "city": "address.city",
        "company": "company.name",
        "age": "datatype.number",
        "created_at": "datatype.datetime"
    }
]
```

The schema needs to be an array of objects, as that way we can produce relational data in the future.

Each object represents a record that will be generated. The `_meta` key is used to define the topic that the record will be sent to.

You can find the documentation for Faker.js [here](https://fakerjs.dev/api/)

### Record Size Option

In some cases, you might need to generate a large amount of data. In that case, you can use the `--record-size` option to generate a record of a specific size.

The `--record-size 1048576` option will generate a 1MB record. So if you have to generate 1GB of data, you run the command with the following options:

```bash
datagen -s ./tests/datasize.json -f json -n 1000 --record-size 1048576
```

This will add a `recordSizePayload` key to the record with the specified size and will send the record to Kafka.

> Note: The 'Max Message Size' of your Kafka cluster needs to be set to a higher value than 1MB for this to work.

### `UPSERT` Evelope Support

To make sure `UPSERT` envelope is supported, you need to define an `id` column in the schema.
The value of the `id` column will be used as the key of the record.

### Faker.js and SQL Schema

The SQL schema option allows you to define the data that is generated using Faker.js by defining a `COMMENT` on the column.

```sql
CREATE TABLE "ecommerce"."products" (
  "id" int PRIMARY KEY,
  "name" varchar COMMENT 'internet.userName',
  "merchant_id" int NOT NULL COMMENT 'datatype.number',
  "price" int COMMENT 'datatype.number',
  "status" int COMMENT 'datatype.boolean',
  "created_at" datetime DEFAULT (now())
);
```

The `COMMENT` needs to be a valid Faker.js function. You can find the documentation for Faker.js [here](https://fakerjs.dev/api/).
