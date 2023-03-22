CREATE TABLE "ecommerce"."products" (
  "id" int PRIMARY KEY,
  "name" varchar COMMENT 'faker.internet.userName()',
  "merchant_id" int NOT NULL COMMENT 'faker.datatype.number()',
  "price" int COMMENT 'faker.datatype.number({ min: 1000, max: 100000 })',
  "status" int COMMENT 'faker.datatype.boolean()',
  "created_at" datetime DEFAULT (now())
);

