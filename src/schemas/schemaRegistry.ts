import { SchemaType } from '@kafkajs/confluent-schema-registry';
import pkg from '@avro/types';
const { Type } = pkg;
import alert from 'cli-alerts';

function nameHook(): any {
    let i = 0;
    return function(schema: any) {
        if (schema.name) {
            schema.name = `name${i++}`;
        }
    }
}

export async function getAvroSchema(topic: string, record: number, debug: boolean = false){
    let avroSchema = Type.forValue(record,{typeHook: nameHook()}).schema();
    avroSchema["name"] = topic
    avroSchema["namespace"] = "com.materialize"

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

export async function getAvroEncodedRecord(record: any, registry: any, schema_id: number) {
    let encodedRecord = await registry.encode(schema_id, record);
    return encodedRecord;
}
