const { SchemaType } = require('@kafkajs/confluent-schema-registry');
const {Type} = require('@avro/types');
const alert = require('cli-alerts');

function nameHook(){
    let i = 0;
    return function(schema){
        schema.name = `name${i++}`;
    }
}

async function getAvroSchema(topic, record, debug = false){
    let avroSchema = Type.forValue(record,{typeHook: nameHook()}).schema();
    avroSchema["name"] = topic
    avroSchema["namespace"] = "com.materialize"

    if (debug) {
        alert({
            type: `success`,
            name: `Avro Schema:`,
            msg: `\n ${JSON.stringify(avroSchema, null, 2)}`
        });
    }

    return avroSchema;
}

async function registerSchema(avroSchema, registry) {
    let options = {subject: avroSchema["name"] + "-value"}
    let schemaId;
    try {
        const resp = await registry.register({
            type: SchemaType.AVRO,
            schema: JSON.stringify(avroSchema)
        },
            options
        )

        schemaId = resp.id

        alert({
            type: `success`,
            name: `Schema registered!`,
            msg: `Subject: ${options.subject}, ID: ${schemaId}`
        });
    } catch (error) {
        alert({
            type: `error`,
            name: `There was a problem registering schema.`,
            msg: `${error}`
        });
    }

    return schemaId;
}

async function getAvroEncodedRecord(record, registry, schema_id) {
    let encodedRecord = await registry.encode(schema_id, record);
    return encodedRecord;
}

exports.getAvroEncodedRecord = getAvroEncodedRecord;
exports.registerSchema = registerSchema;
exports.getAvroSchema = getAvroSchema;