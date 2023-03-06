# End-to-end Tutorial with Materialize

In this tutorial, we will generate relational data about `users`, `purchases`, and `items`. Each user has zero to many purchases, and each purchase has one to many items. At the end, we might like to retrieve a purchase history for a specific user by querying a streaming database.

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
                    "records_per": 2
                }
			]
        },
        "id": "datatype.number(1000)",
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
                    "records_per": 3
                }
			]
        },
        "id": "datatype.uuid",
        "user_id": "datatype.number(1000)",
        "item_id": "datatype.number(5000)",
        "created_at": "date.recent"
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
1. Two purchases are created that are associated with that user, and then
1. Three items are created for each purchase so that the purchase's `item_id` is equal to the `id` for each item associated with it.

Here are a couple of important ideas to note:
- The file is a list of datasets
- Each dataset has a `_meta` object that specifies the key, Kafka topic, and a list of relationships
  - Each relationship specifies the topic, parent field, matching child field, and how many child records should be produced for each parent record
- Each dataset has several fields, where field name is mapped to a [FakerJS API](https://fakerjs.dev/api/) method.
- The primary keys for `users` and `items` use `faker.datatype(<number>)`
  - In effect, this limits the keyspace for these records. For example, user ID is specified with `datatype.number(1000)`, which means there will be a maximum of 1000 unique users, and if a new user is produced with the same ID, it will be interpreted as an update in the downstream database (more on Materialize's `UPSERT` envelope later).

## Set up infrastructure

This tutorial will use a Confluent Cloud Basic Kafka Cluster and Schema Registry as a target for `datagen`, and Materialize as the streaming database for queries.

### Confluent Cloud

1. Create an account on [Confluent Cloud](confluent.cloud).
1. Create a basic cluster in AWS us-east-1.
1. Create an API key / secret for your cluster.
1. Enable Schema Registry.
1. Create an API key / secret for Schema Registry.

### Materialize

1. [Register for access](https://materialize.com/register/) to Materialize.
1. Create a 