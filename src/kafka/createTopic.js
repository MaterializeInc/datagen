const { Kafka, Partitioners, logLevel } = require('kafkajs');
const kafkaConfig = require('./kafkaConfig');
const dotenv = require('dotenv');

module.exports = async (topic = 'test_123') => {
	const kafka = kafkaConfig();

	// Check if the roles_topic exists in the Kafka cluster if not create it
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
