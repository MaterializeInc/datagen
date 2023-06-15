import kafkaConfig from './kafkaConfig.js';
import axios from 'axios';
import alert from 'cli-alerts';
import { Env } from '../utils/env.js';

async function deleteSchemaSubjects(topics: any): Promise<void> {
    const schemaRegistryUrl = Env.optional("SCHEMA_REGISTRY_URL", "http://localhost:8081");

    for await (const topic of topics) {
        const url = `${schemaRegistryUrl}/subjects/${topic}-value?permanent=false`;
        await axios.delete(
            url,
            {
                auth: {
                    // @ts-ignore
                    username: process.env.SCHEMA_REGISTRY_USERNAME,
                    // @ts-ignore
                    password: process.env.SCHEMA_REGISTRY_PASSWORD
                }
            }
        ).then((response) => {
            console.log(response.status);
            console.log(`deleted subject ${topic}-value`);
        })
            .catch((error) => {
                console.error(error.response.status);
                console.error(error.response.data.message);
                process.exit(1);
            });
    }
}

export default async function cleanKafka(format: string, topics: any): Promise<void> {
    if (global.dryRun) {
        console.log("This is a dry run, so no resources will be deleted")
        return
    }
    if (global.prefix) {
        // Loop through topics and add prefix
        topics = topics.map(topic => `${global.prefix}_${topic}`);
        alert({
            type: `success`,
            name: `Using topic with prefix: ${global.prefix}`,
            msg: ``
        });
    }

    const kafka = await kafkaConfig();
    const admin = kafka.admin();
    await admin.connect();
    try {
        await admin.deleteTopics({
            topics
        })
        console.log(`deleted Kafka topics ${topics}`)
    } catch (error) {
        console.log(error)
    }
    await admin.disconnect();

    if (format !== 'avro') {
        console.log("Skipping Schema Registry")
    } else {
        await deleteSchemaSubjects(topics);
    }
};
