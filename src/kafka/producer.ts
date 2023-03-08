import { Kafka, Partitioners, logLevel } from  'kafkajs';
import kafkaConfig from  './kafkaConfig.js';
import alert from  'cli-alerts';

export async function kafkaProducer(producer: any, recordKey = null, record, encodedRecord = null, topic = 'datagen_test_topic') {

    if (global.prefix) {
        topic = `${global.prefix}_${topic}`;
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

export async function connectKafkaProducer() {
    const kafka = await kafkaConfig();
    const producer = kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner
    });

    if (global.debug) {
        console.log(`Connecting to Kafka producer...`);
    }
    await producer.connect();
    return producer;
}

export async function disconnectKafkaProducer(producer: any) {
    if (global.debug) {
        console.log(`Disconnecting from Kafka producer...`);
    }
    await producer.disconnect();
}
