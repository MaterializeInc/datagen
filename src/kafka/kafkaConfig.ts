import { Kafka, KafkaConfig } from 'kafkajs';
import { Env } from '../utils/env.js';

export default async function kafkaConfig() {
    const kafkaBrokers = Env.optional("KAFKA_BROKERS", "localhost:9092");
    const kafkaUser = Env.optional("SASL_USERNAME", null);
    const kafkaPassword = Env.optional("SASL_PASSWORD", null);
    const saslMechanism = Env.optional("SASL_MECHANISM", 'plain');

    if (kafkaUser && kafkaPassword) {
        const conf: KafkaConfig = {
            brokers: [kafkaBrokers],
            sasl: {
                mechanism: saslMechanism,
                // @ts-ignore
                username: kafkaUser,
                password: kafkaPassword
            },
            ssl: true,
            connectionTimeout: 10_000,
            authenticationTimeout: 10_000
        };
        const kafka = new Kafka(conf);
        return kafka;
    }

    const kafka = new Kafka({
        brokers: [`${kafkaBrokers}`],
        ssl: false,
        connectionTimeout: 10_000,
        authenticationTimeout: 10_000
    });
    return kafka;
};
