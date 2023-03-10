import pkg from 'kafkajs';
const { ConfigResourceTypes } = pkg;
import kafkaConfig from './kafkaConfig.js';
import alert from 'cli-alerts';

export default async function createTopic(topic: string): Promise<void> {
    const kafka = await kafkaConfig();

    if (global.debug) {
        console.log(`Trying to create topic: ${topic}`);
    }

    if (global.prefix) {
        topic = `${global.prefix}_${topic}`;
        alert({
            type: `success`,
            name: `Using topic with prefix: ${topic}`,
            msg: ``
        });
    }

    // Check if the topic exists in the Kafka cluster if not create it
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();

    if (!topics.includes(topic)) {
        let replicationFactor = await getReplicationFactor(admin);

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

async function getReplicationFactor(admin: any) {

    let replicationFactor = 1;

    try {
        if (global.debug) {
            console.log(`Trying to get brokers list...`);
        }
        const brokersList = await admin.describeCluster();
        const brokerId = brokersList.brokers[0].nodeId.toString();

        if (global.debug) {
            console.log(`Trying to get default replication factor...`);
        }

        const brokerConfigs = await admin
            .describeConfigs({
                resources: [{ type: ConfigResourceTypes.BROKER, name: brokerId, configNames: ['default.replication.factor'] }]
            })
            .catch(err => {
                if (global.debug) {
                    console.log(err);
                }
            });

        replicationFactor = brokerConfigs.resources[0].configEntries.find(
            entry => entry.configName === 'default.replication.factor'
        ).configValue;
    } catch (err) {
        console.log(`Error getting default replication factor, using 1`);
        if (global.debug) {
            console.log(err);
        }
    }

    return replicationFactor;
}
