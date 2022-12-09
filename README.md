# Datagen CLI

### Installation

```bash
npm install
npm link
```

### Usage

```bash
datagen --help

Usage: datagen [options]

Fake Data Generator

Options:
  -V, --version                output the version number
  -f, --format <char>          The format of the produced data (choices: "json", "avro", "csv", default: "json")
  -s, --schema <char>          Schema file to use
  -sf, --schema-format <char>  The format of the schema file (choices: "json", "avro", "sql", default: "sql")
  -n, --number <char>          Number of records to generate (default: "10")
  -d, --debug <char>            (choices: "true", "false", default: "false")
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
datagen -s products.sql -sf sql -f json -n 10
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

### TODO

- [ ] Add support for more output formats:
    - [ ] Avro
    - [ ] CSV
- [ ] Add support for more schema formats:
    - [ ] Avro
    - [ ] JSON
- [ ] Add tests

