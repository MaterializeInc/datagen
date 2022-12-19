const alert = require('cli-alerts');
var avro = require('avro-js');
const fs = require('fs');
const { faker } = require('@faker-js/faker');
const generate = require('@ovotech/avro-mock-generator');

async function prepareAvroData(schema) {
    const record = generate.default(schema);
    return record;
}

async function parseAvroSchema(schemaFile, debug = false) {
    alert({
        type: `success`,
        name: `Parsing Avro schema...`,
        msg: ``
    });

    if (debug === 'true') {
        const parsed = avro.parse(schemaFile);
        console.log(parsed);
    }
    const schema = [];
    parsed = JSON.parse(schemaFile);
    schema.push(parsed);
    return schema;
}


async function getAvroTopicName(schemaFile) {
    if (schemaFile.name){
        return schemaFile.name;
    }
    return 'datagen_test_topic';
}

exports.parseAvroSchema = parseAvroSchema;
exports.prepareAvroData = prepareAvroData;
exports.getAvroTopicName = getAvroTopicName;
