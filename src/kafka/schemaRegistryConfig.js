const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');
const dotenv = require('dotenv');


module.exports = () => {
    dotenv.config();
    // Schema Registry details
    // Abort if SR details are not defined
    if (
        !process.env.SCHEMA_REGISTRY_URL ||
        !process.env.SCHEMA_REGISTRY_USERNAME ||
        !process.env.SCHEMA_REGISTRY_PASSWORD
    ) {
        alert({
            type: `error`,
            name: `Schema Registry details not defined`,
            msg: `\n  Please define the Schema Registry details in the .env file`
        });
        process.exit(0);
    }

    const url = process.env.SCHEMA_REGISTRY_URL ;
    const username = process.env.SCHEMA_REGISTRY_USERNAME;
    const password = process.env.SCHEMA_REGISTRY_PASSWORD;
    const registry = new SchemaRegistry({
        host: url,
        auth: {
            username: username,
            password: password
        }
    });

    return registry;

}