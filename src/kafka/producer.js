const { Kafka, Partitioners, logLevel } = require('kafkajs');
const kafkaConfig = require('./kafkaConfig');
const alert = require('cli-alerts');
const dotenv = require('dotenv');

module.exports = async (record, encodedRecord = null, topic = 'test_123') => {
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

    await producer.send({
        topic: topic,
        messages: [{
            // TODO: keys don't work yet.
            key: record["id"],
            value: payload
        }]
    });

    alert({
        type: `success`,
        name: `Record sent to Kafka topic: ${topic}`,
        msg: `\n  ${JSON.stringify(record)}`
    });

    await producer.disconnect();
};
