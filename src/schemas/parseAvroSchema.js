const alert = require('cli-alerts');
var avro = require('avro-js');
const fs = require('fs');
const { faker } = require('@faker-js/faker');

async function parseAvroSchema(schemaFile) {
    alert({
        type: `success`,
        name: `Parsing Avro schema...`,
        msg: ``
    });

    if (debug) {
        const parsed = avro.parse(schemaFile);
        console.log(parsed);
    }

    let schema = [];
    parsed = JSON.parse(schemaFile);
    schema.push(parsed);

    schema = await convertAvroSchemaToJson(schema);

    return schema;
}


async function convertAvroSchemaToJson(schema) {
    let jsonSchema = [];
    schema.forEach(table => {
        let schema = {
            _meta: {
                topic: table.name
            }
        };
        table.fields.forEach(column => {
            if (column.type === 'record') {
                schema[column.name] = convertAvroSchemaToJson(column.type);
            } else {
                if (Array.isArray(column.type)) {
                    if (column.type.length === 2 && column.type[0] === 'null') {
                        return schema[column.name] = avroTypesToFakerJs(column.type[1]);
                    }
                } else {
                    // If nested, generated nested json recursively
                    if (column.type.type === 'array') {
                        return schema[column.name] = 'datatype.array';
                    }
                    return schema[column.name] = avroTypesToFakerJs(column.type);
                }
            }
        });
        jsonSchema.push(schema);
    });

    return jsonSchema;
}

function avroTypesToFakerJs(avroType) {
    // Function to convert Avro types to Faker.js types
    switch (avroType) {
        case 'string':

            return 'datatype.string';
        case 'int':
            return 'datatype.number';
        case 'long':
            return 'datatype.number';
        case 'float':
            return 'datatype.number';
        case 'double':
            return 'datatype.number';
        case 'boolean':
            return 'datatype.boolean';
        case 'bytes':
            return 'datatype.string';
        case 'array':
            return 'datatype.array';
        case 'map':
            return 'datatype.object';
        case 'union':
            return 'datatype.union';
        case 'enum':
            return 'datatype.string';
        case 'fixed':
            return 'datatype.string';
        case 'record':
            return 'datatype.object';
        default:
            return 'datatype.string';
    }
}

exports.parseAvroSchema = parseAvroSchema;
