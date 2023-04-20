import { SchemaRegistry, SchemaType } from "@kafkajs/confluent-schema-registry";
import { Env } from "../utils/env.js";
import { OutputFormat } from "./outputFormat";
import alert from 'cli-alerts';
import avroTypes from '@avro/types';
const { Type } = avroTypes;

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
                username,
                password
            };
        }

        const registry = new SchemaRegistry(configuration);
        return new AvroFormat(registry);
    }

    constructor(registry: SchemaRegistry) {
        this.registry = registry;
    }

    private static nameHook() {
        let index = 0;
        return (schema, opts) => {
            switch (schema.type) {
                case 'enum':
                case 'fixed':
                case 'record':
                    schema.name = `Auto${index++}`;
                    break;
                default:
            }
        };
    }

    // @ts-ignore
    static async getAvroSchemas(megaRecord: any) {
        const avroSchemas = {};
        for (const topic in megaRecord) {
            // @ts-ignore
            const avroSchema = Type.forValue(megaRecord[topic].records[0], { typeHook: this.nameHook() }).schema();
            avroSchema["name"] = topic
            avroSchema["namespace"] = "com.materialize"

            if (global.debug) {
                alert({
                    type: `success`,
                    name: `Avro Schema for topic ${topic}:`,
                    msg: `\n ${JSON.stringify(avroSchema, null, 2)}`
                });
            }

            avroSchemas[topic] = avroSchema;
        }
        return avroSchemas;
    }

    async register(megaRecord: any): Promise<void> {
        const avroSchemas = await AvroFormat.getAvroSchemas(megaRecord);
        for (const topic in avroSchemas) {
            const options = { subject: `${topic}-value` }
            const avroSchema = avroSchemas[topic]
            try {
                const resp = await this.registry.register({
                    type: SchemaType.AVRO,
                    schema: JSON.stringify(avroSchema)
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
                    'schema': avroSchema
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
    }

    async encode(record: any, topic: string): Promise<Buffer> {
        const schemaId = this.schemas[topic]['schemaId']
        const encodedRecord = await this.registry.encode(schemaId, record);
        return encodedRecord;
    }
}