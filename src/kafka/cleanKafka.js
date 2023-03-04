const kafkaConfig = require('./kafkaConfig');
const axios = require('axios');
const dotenv = require('dotenv');


async function deleteSchemaSubjects(topics) {
    dotenv.config();
    if (!process.env.SCHEMA_REGISTRY_URL) {
        console.error("Please set SCHEMA_REGISTRY_URL");
        process.exit();
    }
    for await (const topic of topics){
        let url = `${process.env.SCHEMA_REGISTRY_URL}/subjects/${topic}-value?permanent=false`;
        await axios.delete(
            url,
            {
                auth: {
                    username: process.env.SCHEMA_REGISTRY_USERNAME,
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
          });
    }
}

module.exports = async (format, topics) => {

    if (dryRun) {
        console.log("This is a dry run, so no resources will be deleted")
        return
    }
    const kafka = kafkaConfig();
    const admin = kafka.admin();
    await admin.connect();
    try {
        await admin.deleteTopics({
            topics: topics
        })
        console.log(`deleted Kafka topics ${topics}`)
    } catch (error) {
        console.log(error)
    }
    await admin.disconnect();

    if (format != 'avro') {
        console.log("Skipping Schema Registry")
    } else {
        await deleteSchemaSubjects(topics);
    }

};
