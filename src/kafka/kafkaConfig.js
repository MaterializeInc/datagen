const { Kafka, Partitioners, logLevel } = require('kafkajs');
const dotenv = require('dotenv');
const alert = require('cli-alerts');


module.exports = () => {
    dotenv.config();
    // Kafka details
    // Abort if kafka details are not defined
    if (
        !process.env.KAFKA_BROKERS ||
        !process.env.SASL_USERNAME ||
        !process.env.SASL_PASSWORD ||
        !process.env.SASL_MECHANISM
    ) {
        alert({
            type: `error`,
            name: `Kafka details not defined`,
            msg: `\n  Please define the Kafka details in the .env file`
        });
        process.exit(0);
    }
    const kafkaBrokers = process.env.KAFKA_BROKERS || 'localhost:9092';
    const kafkaUser = process.env.SASL_USERNAME || 'test';
    const kafkaPassword = process.env.SASL_PASSWORD || 'test';
    const saslMechanism = process.env.SASL_MECHANISM || 'PLAIN';

    const kafka = new Kafka({
        brokers: [kafkaBrokers],
        sasl: {
            mechanism: saslMechanism,
            username: kafkaUser,
            password: kafkaPassword
        },
        ssl: true,
        connectionTimeout: 10_000,
        authenticationTimeout: 10_000
        // logLevel: logLevel.DEBUG,
    });
    return kafka;
};
