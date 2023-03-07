import { Kafka, KafkaConfig, Mechanism, SASLOptions } from 'kafkajs';
import dotenv from 'dotenv';
import alert from 'cli-alerts';

interface MyKafkaConfig extends KafkaConfig {
    sasl?: SASLOptions | Mechanism;
}

export default async function kafkaConfig() {
    dotenv.config();
    // Abort if kafka details are not defined
    if (!process.env.KAFKA_BROKERS) {
        alert({
            type: `error`,
            name: `Kafka details not defined`,
            msg: `\n  Please define the Kafka details in the .env file`
        });
        process.exit(0);
    }

    // Kafka details
    const kafkaBrokers = process.env.KAFKA_BROKERS || 'localhost:9092';
    const kafkaUser = process.env.SASL_USERNAME || null;
    const kafkaPassword = process.env.SASL_PASSWORD || null;
    const saslMechanism = process.env.SASL_MECHANISM || 'plain';
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
            // logLevel: logLevel.DEBUG,
        };
        const kafka = new Kafka(conf);
        return kafka;
    }

    const kafka = new Kafka({
        brokers: [`${kafkaBrokers}`],
        ssl: false,
        connectionTimeout: 10_000,
        authenticationTimeout: 10_000
        // logLevel: logLevel.DEBUG,
    });
    return kafka;
};
