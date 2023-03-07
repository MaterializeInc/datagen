import alert from 'cli-alerts';
import crypto from 'crypto';
import createTopic from './kafka/createTopic.js';
import schemaRegistryConfig from './kafka/schemaRegistryConfig.js';
import { kafkaProducer, connectKafkaProducer, disconnectKafkaProducer } from './kafka/producer.js';
import {
    getAvroEncodedRecord,
    registerSchema,
    getAvroSchema
} from './schemas/schemaRegistry.js';

import { generateMegaRecord } from './schemas/generateMegaRecord.js';

async function* asyncGenerator(number: number) {
    let i = 0;
    // If number is -1, generate infinite records
    if (number === -1) {
        while (true) {
            yield i;
            i++;
        }
    } else {
        for (i; i < number; i++) {
            yield i;
        }
    }
}

function sleep(s: number) {
    if (global.debug && global.wait > 0) {
        alert({
            type: `success`,
            name: `Sleeping for ${s} milliseconds...`,
            msg: ``
        });
    }
    return new Promise(resolve => setTimeout(resolve, s));
}

async function prepareTopic(topic: string) {
    if (global.dryRun) {
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
        await createTopic(topic);
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

async function prepareSchema(megaRecord: any, topic: string, registry: string, avroSchemas: any) {
    alert({
        type: `success`,
        name: `Registering Avro schema...`,
        msg: ``
    });
    let avroSchema = await getAvroSchema(
        topic,
        megaRecord[topic].records[0]
    );
    let schemaId = await registerSchema(avroSchema, registry);
    avroSchemas[topic] = {};
    avroSchemas[topic]['schemaId'] = schemaId;
    avroSchemas[topic]['schema'] = avroSchema;
    return avroSchemas;
}

export default async function dataGenerator({
    format,
    schema,
    number
}: {
    format: string;
    schema: string;
    number: number;
}): Promise<void> {

    let payload: string;
    if (global.recordSize) {
        global.recordSize = global.recordSize / 2;
        payload = crypto.randomBytes(global.recordSize).toString('hex');
    }

    let registry;
    let producer;
    let avroSchemas = {};
    if(global.dryRun !== true){
        producer = await connectKafkaProducer();
    }
    for await (const iteration of asyncGenerator(number)) {
        global.iterationIndex = iteration;
        let megaRecord = await generateMegaRecord(schema);

        if (iteration == 0) {
            if (format == 'avro') {
                if (global.dryRun) {
                    alert({
                        type: `success`,
                        name: `Dry run: Skipping schema registration...`,
                        msg: ``
                    });
                } else {
                    registry = await schemaRegistryConfig();
                }
            }
            for (const topic in megaRecord) {
                await prepareTopic(topic);
                if (format == 'avro' && global.dryRun !== true) {
                    avroSchemas = await prepareSchema(
                        megaRecord,
                        topic,
                        registry,
                        avroSchemas
                    );
                }
            }
        }

        for (const topic in megaRecord) {
            for await (const record of megaRecord[topic].records) {
                let encodedRecord = null;
                let recordKey = null;
                if (record[megaRecord[topic].key]) {
                    recordKey = record[megaRecord[topic].key];
                }

                if (global.recordSize) {
                    record.recordSizePayload = payload;
                }

                if (global.dryRun) {
                    alert({
                        type: `success`,
                        name: `Dry run: Skipping record production...`,
                        msg: `\n  Topic: ${topic} \n  Record key: ${recordKey} \n  Payload: ${JSON.stringify(
                            record
                        )}`
                    });
                } else {
                    if (format == 'avro') {
                        encodedRecord = await getAvroEncodedRecord(
                            record,
                            registry,
                            avroSchemas[topic]['schemaId']
                        );
                    }
                    await kafkaProducer(producer, recordKey, record, encodedRecord, topic);
                }
            }
        }

        await sleep(global.wait);
    }
    if (global.dryRun !== true) {
        await disconnectKafkaProducer(producer);
    }
};
