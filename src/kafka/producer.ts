import { Partitioners, Producer } from 'kafkajs';
import kafkaConfig from './kafkaConfig.js';
import alert from 'cli-alerts';
import { OutputFormat } from '../formats/outputFormat.js';
import createTopics from './createTopics.js';

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

    async prepare(megaRecord: any): Promise<void> {
        await createTopics(megaRecord);
        await this.format.register(megaRecord);
    }

    async send(key: any, value: any, topic: string) {
        const encoded = await this.format.encode(value, topic);
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
