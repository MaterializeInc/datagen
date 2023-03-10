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
export async function getAvroSchema(topic, record) {
    // @ts-ignore
    let avroSchema = Type.forValue(record, { typeHook: nameHook() }).schema();
    avroSchema["name"] = topic
    avroSchema["namespace"] = "com.materialize"

    if (global.prefix) {
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
