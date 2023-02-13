const alert = require('cli-alerts');
const fs = require('fs');
const { faker } = require('@faker-js/faker');
const crypto = require('crypto');

async function prepareJsonData(schema, uuid = null) {
    // Iterate over the object and replace the values with faker data
    const record = {};
    for (const [key, value] of Object.entries(schema)) {
        if (key === '_meta') {
            if (schema._meta && schema._meta.benchmark) {
                const size = (schema._meta.benchmark) / 2;
                let payload = crypto.randomBytes(size).toString('hex');
                record["benchmarkPayload"] = payload;
                continue;
            }
            continue;
        }
        if (typeof value === 'object') {
            record[key] = await prepareJsonData(value);
        } else {
            // Check if the schema has a key property in the _meta object
            if (schema._meta && schema._meta.key) {
                if (key === schema._meta.key) {
                    if (uuid) {
                        record[key] = uuid;
                        continue;
                    }
                }
            }
            if (schema._meta && schema._meta.foreignKey) {
                if (key === schema._meta.foreignKey) {
                    if (uuid) {
                        record[key] = uuid;
                        continue;
                    }
                }
            }
            const [fakerMethod, fakerProperty] = value.split('.');
            record[key] = faker[fakerMethod][fakerProperty]();
        }
    }
    return record;
}

async function parseJsonSchema(schemaFile) {
    alert({
        type: `success`,
        name: `Parsing JSON schema...`,
        msg: ``
    });

    if (debug === 'true') {
        const parsed = JSON.parse(schemaFile);
        console.log(parsed);
    }

    parsed = JSON.parse(schemaFile);
    if (!Array.isArray(parsed)) {
        parsed = [parsed];
    }

    return parsed;
}

async function getJsonTopicName(schemaFile) {
    const parsed = schemaFile;

    // Check if the topic is defined in the schema
    if (parsed._meta && parsed._meta.topic) {
        return parsed._meta.topic;
    }
    return 'datagen_test_topic';
}

exports.parseJsonSchema = parseJsonSchema;
exports.prepareJsonData = prepareJsonData;
exports.getJsonTopicName = getJsonTopicName;
