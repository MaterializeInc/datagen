CREATE TABLE "ecommerce"."products" (
  "id" int PRIMARY KEY,
  "name" varchar COMMENT 'internet.userName',
  "merchant_id" int NOT NULL COMMENT 'datatype.number',
  "price" int COMMENT 'datatype.number',
  "status" int COMMENT 'datatype.boolean',
  "created_at" datetime DEFAULT (now())
);

