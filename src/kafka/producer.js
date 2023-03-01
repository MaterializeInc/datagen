const { Kafka, Partitioners, logLevel } = require('kafkajs');
const kafkaConfig = require('./kafkaConfig');
const alert = require('cli-alerts');
const dotenv = require('dotenv');

module.exports = async (recordKey = null, record, encodedRecord = null, topic = 'datagen_test_topic') => {
    // Produce the record to Kafka
    const kafka = kafkaConfig();

    const producer = kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner
    });
    await producer.connect();

    let payload;
    if (encodedRecord) {
        payload = encodedRecord;
    } else {
        payload = JSON.stringify(record);
    }

    if (recordKey !== null) {
        recordKey = recordKey.toString();
    }

    await producer.send({
        topic: topic,
        messages: [{
            key: recordKey,
            value: payload
        }]
    });

    alert({
        type: `success`,
        name: `Record sent to Kafka topic: ${topic}`,
        msg: `\nkey: ${recordKey}\nvalue:\n${JSON.stringify(record)}`
    });

    await producer.disconnect();
};
