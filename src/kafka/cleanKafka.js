const kafkaConfig = require('./kafkaConfig');
const axios = require('axios');
const dotenv = require('dotenv');


async function deleteSchemaSubjects(topics) {
    dotenv.config();
    for (const topic of topics){
        let url = `${process.env.SCHEMA_REGISTRY_URL}/subjects/${topic}-value?permanent=true`;
        axios.delete(
            url,
            {
                auth: {
                    username: process.env.SCHEMA_REGISTRY_USERNAME,
                    password: process.env.SCHEMA_REGISTRY_PASSWORD
                }
            }
        ).then((response) => {
            console.log(response.data);
          })
          .catch((error) => {
            console.error(error);
          });
    }
}

module.exports = async (format, topics) => {

    if (dryRun == 'true') {
        console.log("This is a dry run, so no resources will be deleted")
        return
    }
    const kafka = kafkaConfig();
    const admin = kafka.admin();
    await admin.connect();
    await admin.deleteTopics({
        topics: topics
    })
    if (format != 'avro') {
        console.log("Skipping Schema Registry")
    } else {
        await deleteSchemaSubjects(topics);
    }

};