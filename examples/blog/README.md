# Blog Demo

This small example generates relational data for a blog where users make posts, and posts have comments by other users.

## Inspect the Schema

1. Take a moment to look at [blog.json](./blog.json) and make a prediction about what the output will look like.

## Do a Dry Run

Here is a command to do a dry run of a single iteration.

```
datagen \
    --dry-run \
    --debug \
    --schema examples/blog/blog.json \
    --format avro\
    --prefix mz_datagen_blog \
    --number 1
```

Notice that in a single iteration, a user is created, and then 2 posts are created, and for each post, 2 comments are created. Then, since comments are made by users, 2 additional users are created. This happens in such a way that the value of a field in a parent record is passed to child records (eg if `users.id` is `5`, then each associated post will have `posts.user_id` equal to `5`). This makes it so downstream systems can perform meaningful joins.

Also notice the number of unique primary keys of each collection are limited, so over time you will see each key appear multiple times. These can be interpreted in upstream systems as updates.

## (Optional) Produce to Kafka

See [.env.example](../../.env.example) to see the environment variables to connect to your Kafka cluster.
If you use the `--format avro` option, you would also have to set environment variables to connect to your Schema Registry.

After you set those, you can produce to your Kafka cluster. Press `Ctrl+C` when you are ready to stop the producer.

```
datagen \
    --schema examples/blog/blog.json \
    --format avro \
    --prefix mz_datagen_blog \
    --number -1
```

When you are finished, you can delete all the topics and schema subjects with the `--clean` option.

```
datagen \
    --schema examples/blog/blog.json \
    --format avro \
    --prefix mz_datagen_blog \
    --clean
```

## (Optional) Query in Materialize

Materialize is a [streaming database](https://materialize.com/guides/streaming-database/). You create materialized views with standard SQL and Materialize will eagerly read from Kafka topics and Postgres tables and keep your materialized views up to date automatically in response to new data. It's Postgres wire compatible, so you can read your materialized views directly with the `psql` CLI or any Postgres client library.

See the [ecommerce example](../ecommerce/README.md) for a full end-to-end example where data is transformed in and served from Materialize in near real-time.

### Learn More

Check out the Materialize [docs](www.materialize.com/docs) and [blog](www.materialize.com/blog) for more!