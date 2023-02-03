const { Kafka, Partitioners, logLevel } = require('kafkajs');
const kafkaConfig = require('./kafkaConfig');
const schemaRegistryConfig = require('./schemaRegistryConfig');
const alert = require('cli-alerts');
const dotenv = require('dotenv');
const schemaRegistryConfig = require('./schemaRegistryConfig');
const { SchemaType } = require('@kafkajs/confluent-schema-registry');

module.exports = async (record, topic = 'test_123') => {
    // Produce the record to Kafka
    const kafka = kafkaConfig();
    const registry = schemaRegistryConfig();
    const options = {subject: topic + "-value"}

    // how do I do this?
    schema_def = get_schema_def_from_record(record)
    await registry.register({
        type: SchemaType.AVRO,
        schema_def,
        options
    });

    const producer = kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner
    });
    await producer.connect();

    await producer.send({
        topic: topic,
        messages: [{
            key: record[key],
            value: await registry.encode(record)
        }]
    });

    alert({
        type: `success`,
        name: `Record sent to Kafka topic: ${topic}`,
        msg: `\n  ${JSON.stringify(record)}`
    });

    await producer.disconnect();
};
