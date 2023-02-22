const alert = require('cli-alerts');
const crypto = require('crypto');
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
const schemaRegistryConfig = require('./kafka/schemaRegistryConfig');
const { SchemaType } = require('@kafkajs/confluent-schema-registry');
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

function getAvroSchema(topic, record, debug = false){
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

    return avro_schema;
}

async function registerSchema(avro_schema, registry) {
    let options = {subject: avro_schema["name"] + "-value"}
    let schema_id;
    try {
        const resp = await registry.register({
            type: SchemaType.AVRO,
            schema: JSON.stringify(avro_schema)
        },
            options
        )

        schema_id = resp.id

        alert({
            type: `success`,
            name: `Schema registered!`,
            msg: `Subject: ${options.subject}, ID: ${schema_id}`
        });
    } catch (error) {
        alert({
            type: `error`,
            name: `There was a problem registering schema.`,
            msg: `${error}`
        });
    }

    return schema_id;
}

async function getAvroEncodedRecord(record, registry, schema_id) {
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

    let registry;
    if (format == 'avro') {
        registry = schemaRegistryConfig();
    }

    for await (const iteration of asyncGenerator(number)) {
        // let uuid = faker.datatype.uuid();
        await Promise.all(
            schema.map(async table => {
                let record;
                let topic;

                record = await prepareJsonData(table);
                topic = await getJsonTopicName(table);

                let recordKey = null;
                try {
                    recordKey = record[table["_meta"]["key"]]
                } catch (error) {
                    alert({
                        type: `warn`,
                        name: `No key specified. Using null key`,
                        msg: `\n  ${error.message}`
                    });
                }

                if (recordSize) {
                    recordSize = (recordSize) / 2;
                    let payload = crypto.randomBytes(recordSize).toString('hex');
                    record.recordSizePayload = payload;
                }

                let avro_schema;
                let schema_id;
                let encodedRecord = null;
                if (format == 'avro') {
                    avro_schema = getAvroSchema(topic,record,debug);
                }

                if (dryRun == 'true') {
                    alert({
                        type: `success`,
                        name: `Dry run: Skipping record production...`,
                        msg: `\n  Topic: ${topic} \n  Record key: ${recordKey} \n  Payload: ${JSON.stringify(record)}`
                    });
                } else {
                    if (format == 'avro') {
                        schema_id = await registerSchema(avro_schema, registry);
                        encodedRecord = await getAvroEncodedRecord(record,registry,schema_id);
                    }
                    await producer(recordKey, record, encodedRecord, topic)
                }
            })
        );
        await new Promise(resolve => setTimeout(resolve, 500));
    }
};
