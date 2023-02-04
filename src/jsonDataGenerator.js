const alert = require('cli-alerts');
const fs = require('fs');
const { faker } = require('@faker-js/faker');
const createTopic = require('./kafka/createTopic');
const producer = require('./kafka/producer');
const {
    prepareAvroData,
    getAvroTopicName
} = require('./schemas/parseAvroSchema');
const {
    prepareJsonData,
    getJsonTopicName
} = require('./schemas/parseJsonSchema');
const { prepareSqlData, getSqlTopicName } = require('./schemas/parseSqlSchema');
const schemaRegistryConfig = require('./kafka/schemaRegistryConfig');
const {Type} = require('@avro/types');


async function* asyncGenerator(number) {
    let i = 0;
    for (i; i < number; i++) {
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


async function registerSchema(format, dryRun, topic, record, debug = false) {

    let avro_schema = Type.forValue(record).schema();
    avro_schema["name"] = topic
    avro_schema["namespace"] = "com.materialize"

    if (debug) {
        alert({
            type: `success`,
            name: `Avro Schema:`,
            msg: `\n ${JSON.stringify(avro_schema, null, 2)}`
        });
    }

    if (dryRun == 'true' || format != 'avro' ) {
        alert({
            type: `success`,
            name: `Skipping schema registration...`,
            msg: ``
        });
        return {"registry": null, "schmema_id": null};
    }

    let registry = schemaRegistryConfig();
    let options = {subject: topic + "-value"}

    let schema_id = await registry.register({
        type: SchemaType.AVRO,
        avro_schema,
        options
    });

    alert({
        type: `success`,
        name: `Schema registered!`,
        msg: `Subject: ${options.subject}, ID: ${schema_id}`
    });

    return {"registry": registry, "schmema_id": schema_id};
}

async function getAvroEncodedRecord(format, record, registry, schema_id) {

    if (format != 'avro') {
        return null;
    }
    let encodedRecord = await registry.encode(schema_id, record);
    return encodedRecord;

}

module.exports = async ({ format, schema, number, schemaFormat, dryRun = false, debug = false }) => {
    await prepareTopic(schema, schemaFormat, dryRun);

    alert({
        type: `success`,
        name: `Producing records...`,
        msg: ``
    });

    for await (const iteration of asyncGenerator(number)) {
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

                let registry;
                let schema_id;
                let encodedRecord;
                if (iteration == 0) {
                    let registerSchemaResponse = registerSchema(format, dryRun, topic, record, debug);
                    registry = registerSchemaResponse.registry;
                    schema_id = registerSchemaResponse.schema_id;
                }
                
                encodedRecord = await getAvroEncodedRecord(format,record,registry,schema_id)

                if (dryRun == 'true') {
                    alert({
                        type: `success`,
                        name: `Dry run: Skipping record production...`,
                        msg: `\n  ${JSON.stringify(record)}`
                    });
                } else {
                    await producer(record, encodedRecord, topic);
                }
            })
        );
        await new Promise(resolve => setTimeout(resolve, 500));
    }
};
