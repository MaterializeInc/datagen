const { Kafka, Partitioners, logLevel } = require('kafkajs');
const kafkaConfig = require('./kafkaConfig');
const alert = require('cli-alerts');
const dotenv = require('dotenv');

module.exports = async (record, topic = 'test_123') => {
    // Produce the record to Kafka
    const kafka = kafkaConfig();

    const producer = kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner
    });
    await producer.connect();

    await producer.send({
        topic: topic,
        messages: [{ value: JSON.stringify(record) }]
    });

    alert({
        type: `success`,
        name: `Record sent to Kafka topic`,
        msg: `\n  ${JSON.stringify(record)}`
    });
};
