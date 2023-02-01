const alert = require('cli-alerts');
const fs = require('fs');
const { faker } = require('@faker-js/faker');
const createTopic = require('./kafka/createTopic');
const jsonProducer = require('./kafka/jsonProducer');
const {
    prepareAvroData,
    getAvroTopicName
} = require('./schemas/parseAvroSchema');
const {
    prepareJsonData,
    getJsonTopicName
} = require('./schemas/parseJsonSchema');
const { prepareSqlData, getSqlTopicName } = require('./schemas/parseSqlSchema');

async function* asyncGenerator(records) {
    let i = 0;
    for (i; i < records; i++) {
        yield i;
    }
}

async function prepareTopic(schema, schemaFormat, dryRun) {
    if (dryRun == 'true') {
        alert({
            type: `success`,
            name: `Dry run: Skipping topic creation...`,
            msg: ``
        });
        return;
    }

    alert({
        type: `success`,
        name: `Creating Kafka topics...`,
        msg: ``
    });

    try {
        await Promise.all(
            schema.map(async topic => {
                let topicName;
                switch (schemaFormat) {
                    case 'avro':
                        topicName = await getAvroTopicName(topic);
                        await createTopic(topicName);
                        break;
                    case 'json':
                        topicName = await getJsonTopicName(topic);
                        await createTopic(topicName)
                        break;
                    case 'sql':
                        topicName = await getSqlTopicName(topic);
                        await createTopic(topicName)
                        break;
                    default:
                        await createTopic();
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        break;
                }
                alert({
                    type: `success`,
                    name: `Created topic ${topicName}`,
                    msg: ``
                });
            })
        );
    } catch (error) {
        alert({
            type: `error`,
            name: `Error creating Kafka topic, try creating it manually...`,
            msg: `\n  ${error.message}`
        });
        process.exit(0);
    }
}

module.exports = async ({ schema, records, schemaFormat, dryRun = false }) => {
    await prepareTopic(schema, schemaFormat, dryRun);

    alert({
        type: `success`,
        name: `Producing records...`,
        msg: ``
    });

    for await (const record of asyncGenerator(records)) {
        let uuid = faker.datatype.uuid();
        await Promise.all(
            schema.map(async table => {
                let record;
                let topic;
                switch (schemaFormat) {
                    case 'avro':
                        record = await prepareAvroData(table);
                        topic = await getAvroTopicName(table);
                        break;
                    case 'json':
                        record = await prepareJsonData(table, uuid);
                        topic = await getJsonTopicName(table);
                        break;
                    case 'sql':
                        record = await prepareSqlData(table);
                        topic = await getSqlTopicName(table);
                        break;
                    default:
                        break;
                }
                if (dryRun == 'true') {
                    alert({
                        type: `success`,
                        name: `Dry run: Skipping record production...`,
                        msg: `\n  Topic: ${topic} \n  Payload: ${JSON.stringify(record)}`
                    });
                } else {
                    await jsonProducer(record, topic);
                }
            })
        );
        await new Promise(resolve => setTimeout(resolve, 500));
    }
};
