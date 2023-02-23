const { SchemaType } = require('@kafkajs/confluent-schema-registry');
const {Type} = require('@avro/types');

async function getAvroSchema(topic, record, debug = false){
    let avro_schema = Type.forValue(record).schema();
    avro_schema["name"] = topic
    avro_schema["namespace"] = "com.materialize"

    if (debug) {
        alert({
            type: `success`,
            name: `Avro Schema:`,
            msg: `\n ${JSON.stringify(avro_schema, null, 2)}`
        });
    }

    return avro_schema;
}

async function registerSchema(avro_schema, registry) {
    let options = {subject: avro_schema["name"] + "-value"}
    let schema_id;
    try {
        const resp = await registry.register({
            type: SchemaType.AVRO,
            schema: JSON.stringify(avro_schema)
        },
            options
        )

        schema_id = resp.id

        alert({
            type: `success`,
            name: `Schema registered!`,
            msg: `Subject: ${options.subject}, ID: ${schema_id}`
        });
    } catch (error) {
        alert({
            type: `error`,
            name: `There was a problem registering schema.`,
            msg: `${error}`
        });
    }

    return schema_id;
}

async function getAvroEncodedRecord(record, registry, schema_id) {
    let encodedRecord = await registry.encode(schema_id, record);
    return encodedRecord;
}

exports.getAvroEncodedRecord = getAvroEncodedRecord;
exports.registerSchema = registerSchema;
exports.getAvroSchema = getAvroSchema;