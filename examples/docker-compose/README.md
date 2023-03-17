# Datagen Docker Compose Demo

In this demo, we will show you how to use `docker-compose` to run multiple `datagen` instances and produce 30GB of data to a Kafka cluster.

## Overview

The [`docker-compose.yaml`](docker-compose.yaml) file defines the following services:

- `redpanda`: A single-node Kafka instance.
- 3 `datagen` instances that produce data to Redpanda simultaneously.

### Datagen instances overview

Each `datagen` instance produces 10GB of random data to Redpanda using an auto incrementing key thanks to the `iteration.index` identifier in the [`schemas/schema.json`](schemas/schema.json) file. This allows you to simulate an upsert source with a total of 30GB of data but only 10GB of unique data.

Example of the `datagen` instance configuration:

```yaml
  datagen1:
    image: materialize/datagen:latest
    container_name: datagen1
    depends_on:
      - redpanda
    environment:
      KAFKA_BROKERS: redpanda:9092
    volumes:
      - ./schemas:/schemas
    entrypoint:
      datagen -s /tests/schema.json -f json -n 10024 --record-size 1048576 -d
```

Rundown of the `datagen` instance configuration:

- `image`: The `datagen` Docker image.
- `container_name`: The name of the container. This should be unique for each instance.
- `depends_on`: The `datagen` instance depends on the `redpanda` service.
- `environment`: The `KAFKA_BROKERS` environment variable is used to configure the Kafka/Redpanda brokers. If you are using a Kafka cluster with SASL authentication, you can also set the `SASL_USERNAME`, `SASL_PASSWORD` and `SASL_MECHANISM` environment variables.
- `volumes`: The `datagen` instance mounts the `schemas` directory to the `/schemas` directory in the container. This is where we have the `schema.json` file.
- `entrypoint`: The `datagen` command line arguments. The `-s` flag is used to specify the schema file. The `-f` flag is used to specify the output format. The `-n` flag is used to specify the number of records to generate. The `--record-size` flag is used to specify the size of each record. The `-d` flag is used to enable debug logging.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Running the demo

1. Clone the `datagen` repository:

    ```bash
    git clone https://github.com/MaterializeInc/datagen.git

    cd datagen/examples/docker-compose
    ```

1. Start the demo:

    ```bash
    docker-compose up -d
    ```

    The demo will take a few minutes to start up. You should see the following output:

    ```bash
    Creating network "docker-compose_default" with the default driver
    Creating docker-compose_redpanda_1  ... done
    Creating docker-compose_datagen_1   ... done
    Creating docker-compose_datagen_2   ... done
    Creating docker-compose_datagen_3   ... done
    ```

1. Verify that the demo is running:

    ```bash
    docker-compose ps -a
    ```

1. Stopping the demo:

    ```bash
    docker-compose down -v
    ```

## Useful links

- [Materialize documentation](https://materialize.com/docs/)
- [Materialize community Slack](https://materialize.com/s/chat)
- [Materialize Blog](https://materialize.com/blog/)
