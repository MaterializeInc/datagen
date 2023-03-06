# End-to-end Tutorial with Materialize


Consider the example from `example-schemas/ecommerce.json`. There are `users`, `purchases`, and `items`. For each iteration of `datagen`, a user is created, then 2 purchases are created that are associated with that user, and then 3 items are created for each purchase so that the purchase's `item_id` is equal to the `id` for each item associated with it.

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