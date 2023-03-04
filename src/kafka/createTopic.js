const { ConfigResourceTypes } = require('kafkajs');
const kafkaConfig = require('./kafkaConfig');
const dotenv = require('dotenv');

module.exports = async (topic = 'datagen_test_topic') => {
    const kafka = kafkaConfig();

    if (debug) {
        console.log(`Trying to create topic: ${topic}`);
    }
    // Check if the topic exists in the Kafka cluster if not create it
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();

    if (!topics.includes(topic)) {

        replicationFactor = await getReplicationFactor(admin);

        let topicConfigs = [
            {
                topic: topic,
                numPartitions: 1,
                replicationFactor: replicationFactor,
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

async function getReplicationFactor(admin) {

    let replicationFactor = 1;

    try {
        if (debug) {
            console.log(`Trying to get brokers list...`);
        }
        const brokersList = await admin.describeCluster();
        const brokerId = brokersList.brokers[0].nodeId.toString();

        if (debug) {
            console.log(`Trying to get default replication factor...`);
        }

        const brokerConfigs = await admin
            .describeConfigs({
                resources: [{ type: ConfigResourceTypes.BROKER, name: brokerId, configNames: ['default.replication.factor'] }]
            })
            .catch(err => {
                if (debug) {
                    console.log(err);
                }
            });

        replicationFactor = brokerConfigs.resources[0].configEntries.find(
            entry => entry.configName === 'default.replication.factor'
        ).configValue;
    } catch (err) {
        console.log(`Error getting default replication factor, using 1`);
        if (debug) {
            console.log(err);
        }
    }

    return replicationFactor;
}
