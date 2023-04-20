import pkg from 'kafkajs';
const { ConfigResourceTypes } = pkg;
import kafkaConfig from './kafkaConfig.js';
import alert from 'cli-alerts';

export default async function createTopics(megaRecord: any): Promise<void> {
    const kafka = await kafkaConfig();

    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    const topicConfigs = [];
    const replicationFactor = await getReplicationFactor(admin);

    for (const topic in megaRecord) {

        if (!topics.includes(topic)) {
            alert({
                type: `success`,
                name: `Attempting to create topic ${topic}`,
                msg: ``
            });
            topicConfigs.push(
                {
                    topic,
                    replicationFactor,
                    numPartitions: 1,
                    configEntries: [
                        {
                            name: 'cleanup.policy',
                            value: 'delete'
                        }
                    ]
                });
        }
    }

    try {
        await admin
            .createTopics({ validateOnly: false, topics: topicConfigs })
            .finally(() => admin.disconnect());
        alert({
            type: `success`,
            name: `Created topics!`,
            msg: ``
        });
    } catch (error) {
        alert({
            type: `error`,
            name: `Error creating Kafka topic, try creating it manually...`,
            msg: `\n  ${error.message}`
        });
        process.exit(1);
    }

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
