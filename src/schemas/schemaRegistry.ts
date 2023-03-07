import { SchemaType } from '@kafkajs/confluent-schema-registry';
import avroTypes from '@avro/types';
const { Type } = avroTypes;
import alert from 'cli-alerts';

function nameHook() {
    let index = 0;
    return function (schema, opts) {
        switch (schema.type) {
            case 'enum':
            case 'fixed':
            case 'record':
                schema.name = `Auto${index++}`;
                break;
            default:
        }
    };
}

// @ts-ignore
export async function getAvroSchema(topic, record){
    // @ts-ignore
    let avroSchema = Type.forValue(record,{typeHook: nameHook()}).schema();
    avroSchema["name"] = topic
    avroSchema["namespace"] = "com.materialize"

    if(global.prefix){
        avroSchema["name"] = `${global.prefix}_${topic}`;
    }

    if (global.debug) {
        alert({
            type: `success`,
            name: `Avro Schema:`,
            msg: `\n ${JSON.stringify(avroSchema, null, 2)}`
        });
    }

    return avroSchema;
}

export async function registerSchema(avroSchema: any, registry: any) {
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

export async function getAvroEncodedRecord(record: any, registry: any, schema_id: any) {
    let encodedRecord = await registry.encode(schema_id, record);
    return encodedRecord;
}
