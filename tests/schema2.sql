CREATE TABLE "ecommerce"."merchants" (
  "id" int,
  "country_code" int,
  "merchant_name" varchar,
  "created_at" varchar,
  "admin_id" int,
  PRIMARY KEY ("id", "country_code")
);

CREATE TABLE "ecommerce"."order_items" (
  "order_id" int,
  "product_id" int,
  "quantity" int DEFAULT 1
);

CREATE TABLE "ecommerce"."orders" (
  "id" int PRIMARY KEY,
  "user_id" int UNIQUE NOT NULL,
  "status" varchar,
  "created_at" varchar
);

CREATE TABLE "ecommerce"."products" (
  "id" int PRIMARY KEY,
  "name" varchar,
  "merchant_id" int NOT NULL,
  "price" int,
  "status" int,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "ecommerce"."product_tags" (
  "id" int PRIMARY KEY,
  "name" varchar
);

CREATE TABLE "ecommerce"."merchant_periods" (
  "id" int PRIMARY KEY,
  "merchant_id" int,
  "country_code" int,
  "start_date" timestamp,
  "end_date" timestamp
);

CREATE TABLE "users" (
  "id" INT,
  "full_name" varchar,
  "created_at" timestamp,
  "country_code" int
);

CREATE TABLE "countries" (
  "code" int PRIMARY KEY,
  "name" varchar,
  "continent_name" varchar
);


CREATE TABLE "ecommerce"."product_tags_products" (
  "product_tags_id" int,
  "products_id" int,
   PRIMARY KEY ("product_tags_id", "products_id")
);
