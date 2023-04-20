import { Kafka, KafkaConfig } from 'kafkajs';
import { Env } from '../utils/env.js';
import fs from 'fs';

export default async function kafkaConfig() {
    const kafkaBrokers = Env.optional("KAFKA_BROKERS", "localhost:9092");
    const kafkaUser = Env.optional("SASL_USERNAME", null);
    const kafkaPassword = Env.optional("SASL_PASSWORD", null);
    const saslMechanism = Env.optional("SASL_MECHANISM", 'plain');
    const sslCaLocation = Env.optional("SSL_CA_LOCATION", null);
    const sslCertLocation = Env.optional("SSL_CERT_LOCATION", null);
    const sslKeyLocation = Env.optional("SSL_KEY_LOCATION", null);

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
        return new Kafka(conf);
    }

    if (sslCaLocation && sslCertLocation && sslKeyLocation) {
        if (!fs.existsSync(sslCaLocation) || !fs.existsSync(sslCertLocation) || !fs.existsSync(sslKeyLocation)) {
            throw new Error("SSL files not found");
        }
        const conf: KafkaConfig = {
            brokers: [kafkaBrokers],
            ssl: {
                ca: [fs.readFileSync(sslCaLocation, 'utf-8')],
                key: fs.readFileSync(sslKeyLocation, 'utf-8'),
                cert: fs.readFileSync(sslCertLocation, 'utf-8')
            },
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
