const alert = require('cli-alerts');
const crypto = require('crypto');
const createTopic = require('./kafka/createTopic');
const producer = require('./kafka/producer');
const schemaRegistryConfig = require('./kafka/schemaRegistryConfig');
const {
    getAvroEncodedRecord,
    registerSchema,
    getAvroSchema
} = require('./schemas/schemaRegistry')

const { generateMegaRecord } = require('./schemas/generateMegaRecord')


async function* asyncGenerator(number) {
    let i = 0;
    for (i; i < number; i++) {
        yield i;
    }
}

async function prepareTopic(topic, dryRun) {
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
        await createTopic(topic)
        alert({
            type: `success`,
            name: `Created topic ${topic}`,
            msg: ``
        });
    } catch (error) {
        alert({
            type: `error`,
            name: `Error creating Kafka topic, try creating it manually...`,
            msg: `\n  ${error.message}`
        });
        process.exit(0);
    }
}



module.exports = async ({ format, schema, number, dryRun = false, debug = false }) => {

    let payload;
    if (recordSize) {
        recordSize = (recordSize) / 2;
        payload = crypto.randomBytes(recordSize).toString('hex');
    }

    let registry;
    let avroSchemas = {};

    for await (const iteration of asyncGenerator(number)) {

        megaRecord = await generateMegaRecord(schema);

        if (recordSize) {
            for (const topic in megaRecord){
                for (const record in megaRecord[topic].records){
                    record.recordSizePayload = payload;
                }
            }
        }

        if (iteration == 0){
            if (format == 'avro'){
                registry = await schemaRegistryConfig();
            }
            for (const topic in megaRecord){
                await prepareTopic(topic, dryRun);
                if (format == 'avro') {
                    let avroSchema = await getAvroSchema(topic,megaRecord[topic].records[0],debug);
                    let schemaId = await registerSchema(avro_schema, registry);
                    avroSchemas[topic].schemaId = schemaId;
                    avroSchemas[topic].schema = avroSchema;
                }
            }
        }

        for (const topic in megaRecord){
            for (const record of megaRecord[topic].records) {

                let encodedRecord = null;
                let recordKey = null;
                if (record[megaRecord[topic].key]){
                    recordKey = record[megaRecord[topic].key]
                }

                if (dryRun == 'true') {
                    alert({
                        type: `success`,
                        name: `Dry run: Skipping record production...`,
                        msg: `\n  Topic: ${topic} \n  Record key: ${recordKey} \n  Payload: ${JSON.stringify(record)}`
                    });
                } else {
                    if (format == 'avro'){
                        encodedRecord = await getAvroEncodedRecord(record,registry,avroSchemas[topic].schemaId);
                    }
                    await producer(recordKey, record, encodedRecord, topic);
                }
            }
        }
    }
}
