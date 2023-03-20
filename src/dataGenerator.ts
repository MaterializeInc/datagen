import alert from 'cli-alerts';
import crypto from 'crypto';
import { KafkaProducer } from './kafka/producer.js';
import { generateMegaRecord } from './schemas/generateMegaRecord.js';
import { OutputFormat } from './formats/outputFormat.js';
import { AvroFormat } from './formats/avroFormat.js';
import { JsonFormat } from './formats/jsonFormat.js';

async function* asyncGenerator(iterations: number) {
    let i = 0;
    // If number is -1, generate infinite records
    if (iterations === -1) {
        while (true) {
            yield i;
            i++;
        }
    } else {
        for (i; i < iterations; i++) {
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

export default async function dataGenerator({
    format,
    schema,
    iterations
}: {
    format: string;
    schema: string;
    iterations: number;
}): Promise<void> {

    let payload: string;
    if (global.recordSize) {
        global.recordSize = global.recordSize / 2;
        payload = crypto.randomBytes(global.recordSize).toString('hex');
    }

    let producer: KafkaProducer | null = null;
    if (global.dryRun !== true) {
        let outputFormat: OutputFormat;
        if (format === 'avro') {
            outputFormat = await AvroFormat.create();
        } else if (format === 'json') {
            outputFormat = new JsonFormat();
        }

        producer = await KafkaProducer.create(outputFormat);
    }

    for await (const iteration of asyncGenerator(iterations)) {
        global.iterationIndex = iteration;
        const megaRecord = await generateMegaRecord(schema);

        if (iteration === 0) {
            await producer?.prepare(megaRecord);
            if (global.debug && global.dryRun && format === 'avro') {
                await AvroFormat.getAvroSchemas(megaRecord);
            }
        }

        for (const topic in megaRecord) {
            for await (const record of megaRecord[topic].records) {
                let key = null;
                if (record[megaRecord[topic].key]) {
                    key = record[megaRecord[topic].key];
                }

                if (global.recordSize) {
                    record.recordSizePayload = payload;
                }

                if (global.dryRun) {
                    alert({
                        type: `success`,
                        name: `Dry run: Skipping record production...`,
                        msg: `\n  Topic: ${topic} \n  Record key: ${key} \n  Payload: ${JSON.stringify(record)}`
                    });
                }

                await producer?.send(key, record, topic);
            }
        }

        await sleep(global.wait);
    }

    await producer?.close();
};
