# Datagen and Materialize Webhooks Source

### What Are Webhooks?

A webhook is a service that sends HTTP POST requests to a target API endpoint when an event occurs. Webhooks are a great way for services to proactively share events when they occur. For example, GitHub allows users to create webhooks that send an event to an endpoint of their choice whenever, say, an issue is filed on their GitHub project.

A webhook delivers data to other applications as it happens, meaning you get data immediately. It's a way for different applications to communicate with each other automatically without any user intervention.

### Introduction to Materialize Webhooks Source

The new [Materialize webhook source](https://materialize.com/docs/sql/create-source/webhook) introduces a new way of ingesting data via webhooks. Webhook sources in Materialize expose a public URL that allows other applications to push data into Materialize. This enables real-time data streaming from various sources, like IoT devices or third-party services.

## Creating a Webhooks Source in Materialize

You can create a webhook source in Materialize using the [`CREATE SOURCE`](https://materialize.com/docs/sql/create-source/) SQL statement that specifies details like the source name, cluster, body format, and an optional check for validation.

### Validation

It is common practice to validate webhooks requests to ensure they're legitimate. The `CHECK` clause in Materialize allows you to define a boolean expression that's used to validate each request received by the source.

Here's an example SQL command to create a webhook source with validation:

```sql
-- Create a shared secret
CREATE SECRET basic_auth_secret AS 'some-secret-value';

-- Create a cluster
CREATE CLUSTER my_webhook_cluster SIZE = 'xsmall', REPLICATION FACTOR = 1;

-- Create a webhook source with validation
CREATE SOURCE my_webhook_source IN CLUSTER my_webhook_cluster FROM WEBHOOK
    BODY FORMAT JSON
    CHECK (
        WITH (
            HEADERS,
            SECRET basic_auth_secret
        )
        "headers" -> 'authorization' = "basic_auth_secret"
    );
```

> **Note**: Without a `CHECK` statement, all requests will be accepted. To prevent bad actors from inserting data, it is strongly encouraged to define a `CHECK` statement with your webhook sources.

The above example creates a webhook source named `my_webhook_source` in the `my_webhook_cluster` cluster. It uses the `JSON` body format and validates each request using the `CHECK` statement.

The public URL for this webhook source is `https://<HOST>/api/webhook/<database>/<schema>/<src_name>`:
- `<HOST>` is the hostname of the Materialize cluster.
- `<database>` is the name of the database where the source is created. Defaults to `materialize`.
- `<schema>` is the name of the schema where the source is created. Defaults to `public`.
- `<src_name>` is the name of the source. In this case, it's `my_webhook_source`.

## Simulating IoT Data with `datagen`

In the context of IoT, webhooks are extremely useful.

![](https://imgur.com/EnW33xM.png)

Once you have your Materialize webhook source ready, create a `.env` file with the following variables:

```
# Webhook
export WEBHOOK_URL=https://<HOST>/api/webhook/<database>/<schema>/<src_name>
export WEBHOOK_SECRET=some-secret-value
```

You can use the [sensors.json](sensors.json) schema:

```bash
datagen -f webhook -s sensors.json -n 1000
```

The above command will generate 1000 JSON payloads and send them to your Materialize webhook source, the output should look like this:

```
✔  Webhook response:
  Status: 200 OK


ℹ  Sending payload to webhook...
  Webhook: https://<HOST>/api/webhook/<database>/<schema>/<src_name>
  Payload: {"sensor_id":82,"timestamp":"2025-12-22T20:02:08.692Z","location":{"latitude":-9,"longitude":97},"temperature":40.46}
...
```

## Compute real-time analytics on IoT data

Let's create a view to cast the JSON payloads into columns with the correct data types:

```sql
CREATE VIEW sensors_data AS SELECT
    (body->>'sensor_id')::text AS "sensor_id",
    (body->>'timestamp')::timestamp AS "timestamp",
    (body->>'temperature')::float AS "temperature",
    (body->'location'->>'latitude')::float AS "latitude",
    (body->'location'->>'longitude')::float AS "longitude"
  FROM my_webhook_source;
```

After that we can create a materialized view to compute real-time analytics on the IoT data in the last 5 minutes:

```sql
CREATE MATERIALIZED VIEW sensors_data_5m AS SELECT
    sensor_id,
    timestamp,
    temperature,
    COUNT(*) AS "count",
    AVG(temperature) AS "avg_temperature"
  FROM sensors_data
  WHERE mz_now() < timestamp + INTERVAL '5 minutes'
  GROUP BY sensor_id, timestamp, temperature;
```

We can query the materialized view to get the latest data:

```sql
SELECT * FROM sensors_data_5m ORDER BY timestamp DESC LIMIT 10;
```

To subscribe to the `sensors_data_5m` materialized view, we can use the `SUBSCRIBE` command:

```sql
COPY (
    SUBSCRIBE TO sensors_data_5m
    WITH (SNAPSHOT = FALSE)
) TO STDOUT;
```

## Conclusion

Webhooks are a powerful tool to stream data between applications, and Materialize's webhooks source provides a seamless way to ingest this data in real time. By understanding the underlying concepts and creating secure and validated webhooks, you can build robust data pipelines that leverage the full potential of real-time data processing. Whether you're simulating IoT device data or integrating third-party services, Materialize's webhooks source offers a flexible and efficient solution.
