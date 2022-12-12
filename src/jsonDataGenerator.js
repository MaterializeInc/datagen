const alert = require('cli-alerts');
const fs = require('fs');
const createTopic = require('./kafka/createTopic');
const jsonProducer = require('./kafka/jsonProducer');
const { prepareAvroData } = require('./schemas/parseAvroSchema');
const { prepareJsonData } = require('./schemas/parseJsonSchema');
const { prepareSqlData } = require('./schemas/parseSqlSchema');

async function* asyncGenerator(records) {
    let i = 0;
    for (i; i < records; i++) {
        yield i;
    }
}

async function prepareTopic(dryRun) {
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
        name: `Creating Kafka topic...`,
        msg: ``
    });

    try {
        await createTopic();
        await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
        alert({
            type: `error`,
            name: `Error creating Kafka topic, try creating it manually...`,
            msg: `\n  ${error.message}`
        });
        process.exit(1);
    }
}

module.exports = async ({ schema, records, schemaFormat, dryRun = false }) => {
    await prepareTopic(dryRun);

    alert({
        type: `success`,
        name: `Producing records...`,
        msg: ``
    });

    for await (const record of asyncGenerator(records)) {
        await Promise.all(
            schema.map(async table => {
                let record;
                let topic;
                switch (schemaFormat) {
                    case 'avro':
                        record = await prepareAvroData(table);
                        break;
                    case 'json':
                        record = await prepareJsonData(table);
                        break;
                    case 'sql':
                        record = await prepareSqlData(table);
                        break;
                    default:
                        break;
                }
                if (dryRun == 'true') {
                    alert({
                        type: `success`,
                        name: `Dry run: Skipping record production...`,
                        msg: `\n  ${JSON.stringify(record)}`
                    });
                } else {
                    await jsonProducer(record, topic);
                }
            })
        );
        await new Promise(resolve => setTimeout(resolve, 500));
    }
};
