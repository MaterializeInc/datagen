import alert from 'cli-alerts';
import { KafkaProducer } from './kafka/producer.js';
import { generateMegaRecord } from './schemas/generateMegaRecord.js';
import { OutputFormat } from './formats/outputFormat.js';
import { AvroFormat } from './formats/avroFormat.js';
import { JsonFormat } from './formats/jsonFormat.js';
import sleep from './utils/sleep.js';
import asyncGenerator from './utils/asyncGenerator.js';

export default async function kafkaDataGenerator({
    format,
    schema,
    iterations,
    initialSchema
}: {
    format: string;
    schema: string;
    iterations: number;
    initialSchema: string;
}): Promise<void> {

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

                if (global.dryRun) {
                    alert({
                        type: `success`,
                        name: `Dry run: Skipping record production...`,
                        msg: `\n  Topic: ${topic} \n  Record key: ${key} \n  Payload: ${JSON.stringify(record)}`
                    });
                    continue;
                }

                await producer?.send(key, record, topic);
            }
        }

        await sleep(global.wait);
    }

    await producer?.close();
};
