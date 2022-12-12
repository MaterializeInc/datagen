const alert = require('cli-alerts');
const fs = require('fs');
const { faker } = require('@faker-js/faker');

async function prepareJsonData(schema) {
    // Iterate over the object and replace the values with faker data
    const record = {};
    for (const [key, value] of Object.entries(schema)) {
        if (key === '_meta') {
            continue;
        }
        if (typeof value === 'object') {
            record[key] = await prepareJsonData(value);
        } else {
            const [fakerMethod, fakerProperty] = value.split('.');
            record[key] = faker[fakerMethod][fakerProperty]();
        }
    }
    return record;
}

async function parseJsonSchema(schemaFile, debug = false) {
    alert({
        type: `success`,
        name: `Parsing JSON schema...`,
        msg: ``
    });

    if (debug === 'true') {
        const parsed = Json.parse(schemaFile);
        console.log(parsed);
    }

    parsed = JSON.parse(schemaFile);
    if (!Array.isArray(parsed)) {
        parsed = [parsed];
    }

    return parsed;
}

exports.parseJsonSchema = parseJsonSchema;
exports.prepareJsonData = prepareJsonData;
