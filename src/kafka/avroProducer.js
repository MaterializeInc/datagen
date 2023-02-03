const { Kafka, Partitioners, logLevel } = require('kafkajs');
const kafkaConfig = require('./kafkaConfig');
const schemaRegistryConfig = require('./schemaRegistryConfig');
const alert = require('cli-alerts');
const dotenv = require('dotenv');
const schemaRegistryConfig = require('./schemaRegistryConfig');

module.exports = async (record, topic = 'test_123') => {
    // Produce the record to Kafka
    const kafka = kafkaConfig();
    const registry = schemaRegistryConfig();

    const producer = kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner
    });
    await producer.connect();

    await producer.send({
        topic: topic,
        messages: [{
            key: record[key],
            value: registry.encode(record)
        }]
    });

    alert({
        type: `success`,
        name: `Record sent to Kafka topic: ${topic}`,
        msg: `\n  ${JSON.stringify(record)}`
    });

    await producer.disconnect();
};
