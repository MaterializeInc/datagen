import { OutputFormat } from "./outputFormat";
import protobuf from "protobufjs";
import alert from "cli-alerts";
import { globSync } from "glob";

export class ProtoFormat implements OutputFormat {
    private schemas: any = {};
    private schemaFiles: Set<string>;

    static async getProtoSchemas(megaRecord: any, protoSchemaFiles: string[]) {

        if (!protoSchemaFiles || protoSchemaFiles.length === 0) {
            protoSchemaFiles = [];
            protoSchemaFiles.push(...(await ProtoFormat.getProtoSchemaFiles(megaRecord)));
        }

        const protoSchemas = {};
        const protoRoot = protobuf.loadSync(protoSchemaFiles);
        for (const topic in megaRecord) {

            const protoSchema = {};
            try {
                protoSchema["messageType"] = protoRoot.lookupType(megaRecord[topic].schema);
                protoSchema["name"] = topic
                protoSchema["namespace"] = megaRecord[topic].schema

                if (global.debug) {
                    alert({
                        type: `success`,
                        name: `Proto Schema for topic ${topic}:`,
                        msg: `\n ${JSON.stringify(protoSchema, null, 2)}`
                    });
                }

                protoSchemas[topic] = protoSchema;
            } catch (error) {
                alert({
                    type: `error`,
                    name: `protobuf lookup type error for schema ${megaRecord[topic].schema}`,
                    msg: `${error}`
                });
                process.exit(1);

            }
        }

        return protoSchemas;
    }

    static async getProtoSchemaFiles(megaRecord: any) {
        const protoFiles = new Set<string>();
        for (const topic in megaRecord) {
            (await ProtoFormat.getProtoSchemaFilesSync(megaRecord[topic].schemaDir)).forEach(file => protoFiles.add(file));
        }
        return protoFiles;
    }

    static async getProtoSchemaFilesSync(directory: string) {
        if (!directory) {
            return [];
        }
        return globSync(directory + (directory.endsWith("/") ? "" : "/") + "**/*.proto");
    }

    async register(megaRecord: any): Promise<void> {
        this.schemaFiles = await ProtoFormat.getProtoSchemaFiles(megaRecord);
        this.schemas = await ProtoFormat.getProtoSchemas(megaRecord, Array.from(this.schemaFiles));
    }

    async encode(record: any, topic: string): Promise<Buffer> {
        const messageType = this.schemas[topic]['messageType'];

        // check if the message is valid
        const error = messageType.verify(record);
        if (global.debug && error) {
            alert({
                type: `warning`,
                name: `${record} with ${this.schemas[topic]['namespace']} is not valid`,
                msg: `${error}`
            });
        }
        // if the message is not valid, convert plain object
        const message = error ? messageType.fromObject(record) : messageType.create(record);

        return messageType.encode(message).finish();
    }
}