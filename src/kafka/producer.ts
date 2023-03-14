import { Partitioners, Producer } from 'kafkajs';
import kafkaConfig from './kafkaConfig.js';
import alert from 'cli-alerts';
import { OutputFormat } from '../formats/outputFormat.js';
import createTopic from './createTopic.js';

export class KafkaProducer {
    private producer: Producer;
    private format: OutputFormat;

    static async create(format: OutputFormat): Promise<KafkaProducer> {
        const kafka = await kafkaConfig();
        const producer = kafka.producer({
            createPartitioner: Partitioners.DefaultPartitioner
        });

        if (global.debug) {
            console.log(`Connecting to Kafka brokers...`);
        }
        await producer.connect();
        return new KafkaProducer(producer, format);
    }

    constructor(producer: Producer, format: OutputFormat) {
        this.producer = producer;
        this.format = format;
    }

    async prepare(topic: string, schema: any): Promise<void> {
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

            await this.format.register(schema, topic);
        } catch (error) {
            alert({
                type: `error`,
                name: `Error creating Kafka topic, try creating it manually...`,
                msg: `\n  ${error.message}`
            });
            process.exit(0);
        }
    }

    async send(key: any, value: any, topic: string) {
        let encoded = await this.format.encode(value, topic);
        await this.producer.send({
            topic: topic,
            messages: [{
                key: key?.toString(),
                value: encoded
            }]
        });

        alert({
            type: `success`,
            name: `Record sent to Kafka topic: ${topic}`,
            msg: `\nkey: ${key}\nvalue:\n${JSON.stringify(value)}`
        });
    }

    async close(): Promise<void> {
        await this.producer.disconnect();
    }
}
