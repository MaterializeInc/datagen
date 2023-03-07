const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');
const dotenv = require('dotenv');

module.exports = async () => {
    dotenv.config();
    // Schema Registry details
    // Abort if SR details are not defined
    if (
        !process.env.SCHEMA_REGISTRY_URL
    ) {
        alert({
            type: `error`,
            name: `Schema Registry details not defined`,
            msg: `\n  Please define the Schema Registry details in the .env file`
        });
        process.exit(0);
    }

    const url = process.env.SCHEMA_REGISTRY_URL;
    const username = process.env.SCHEMA_REGISTRY_USERNAME || null;
    const password = process.env.SCHEMA_REGISTRY_PASSWORD || null;

    if (password && username) {
        const registry = new SchemaRegistry({
            host: url,
            auth: {
                username: username,
                password: password
            }
        });

        return registry;
    }
    const registry = new SchemaRegistry({
        host: url
    });
    return registry;

}
