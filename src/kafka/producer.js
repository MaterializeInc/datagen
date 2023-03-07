const { Kafka, Partitioners, logLevel } = require('kafkajs');
const kafkaConfig = require('./kafkaConfig');
const alert = require('cli-alerts');
const dotenv = require('dotenv');

async function kafkaProducer(producer, recordKey = null, record, encodedRecord = null, topic = 'datagen_test_topic') {

    if (prefix) {
        topic = `${prefix}_${topic}`;
        alert({
            type: `success`,
            name: `Using topic with prefix: ${topic}`,
            msg: ``
        });
    }

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
};

async function connectKafkaProducer() {
    const kafka = kafkaConfig();
    const producer = kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner
    });

    if (debug) {
        console.log(`Connecting to Kafka producer...`);
    }
    await producer.connect();
    return producer;
}

async function disconnectKafkaProducer(producer) {
    if (debug) {
        console.log(`Disconnecting from Kafka producer...`);
    }
    await producer.disconnect();
}

module.exports.kafkaProducer = kafkaProducer;
module.exports.connectKafkaProducer = connectKafkaProducer;
module.exports.disconnectKafkaProducer = disconnectKafkaProducer;
