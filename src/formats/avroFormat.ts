import { SchemaRegistry, SchemaType } from "@kafkajs/confluent-schema-registry";
import { Env } from "../utils/env";
import { OutputFormat } from "./outputFormat";

export class AvroFormat implements OutputFormat {
    private schemas: any = {};
    private registry: SchemaRegistry;

    static async create(): Promise<AvroFormat> {
        const url = Env.required("SCHEMA_REGISTRY_URL");
        const username = Env.optional("SCHEMA_REGISTRY_USERNAME", null);
        const password = Env.optional("SCHEMA_REGISTRY_PASSWORD", null);

        const configuration = {
            host: url
        };

        if (password && username) {
            configuration["auth"] = {
                username: username,
                password: password
            };
        }

        const registry = new SchemaRegistry(configuration);
        return new AvroFormat(registry);
    }

    constructor(registry: SchemaRegistry) {
        this.registry = registry;
    }

    async register(schema: any, topic: string): Promise<void> {
        const options = { subject: `${schema["name"]}-value` }
        try {
            const resp = await this.registry.register({
                type: SchemaType.AVRO,
                schema: JSON.stringify(schema)
            },
                options
            )

            alert({
                type: `success`,
                name: `Schema registered!`,
                msg: `Subject: ${options.subject}, ID: ${resp.id}`
            });

            this.schemas[topic] = {
                'schemaId': resp.id,
                'schema': schema
            };
        } catch (error) {
            alert({
                type: `error`,
                name: `Failed to register schema.`,
                msg: `${error}`
            });

            process.exit(1);
        }
    }

    async encode(record: any, topic: string): Promise<Buffer> {
        const schemaId = this.schemas[topic]['schemaId']
        const encodedRecord = await this.registry.encode(schemaId, record);
        return encodedRecord;
    }
}