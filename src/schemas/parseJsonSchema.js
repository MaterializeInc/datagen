const alert = require('cli-alerts');
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
            if (faker[fakerMethod][fakerProperty] && typeof faker[fakerMethod][fakerProperty] === 'function') {
                record[key] = faker[fakerMethod][fakerProperty]();
            } else {
                console.log(fakerMethod + '.' + fakerProperty + ' is not a valid faker method');
                console.log('Using a random string instead');
                record[key] = faker.random.word();
            }
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
