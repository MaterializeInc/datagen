const { Kafka, Partitioners, logLevel } = require('kafkajs');
const kafkaConfig = require('./kafkaConfig');
const dotenv = require('dotenv');

module.exports = async (topic = 'datagen_test_topic') => {
    const kafka = kafkaConfig();

    if (debug === 'true') {
        console.log(`Trying to create topic: ${topic}`);
    }
    // Check if the topic exists in the Kafka cluster if not create it
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();

    if (!topics.includes(topic)) {
        let topicConfigs = [
            {
                topic: topic,
                numPartitions: 1,
                replicationFactor: 1,
                configEntries: [
                    {
                        name: 'cleanup.policy',
                        value: 'delete'
                    }
                ]
            }
        ];
        await admin
            .createTopics({ validateOnly: false, topics: topicConfigs })
            .finally(() => admin.disconnect());
    }

    await admin.disconnect();
};
