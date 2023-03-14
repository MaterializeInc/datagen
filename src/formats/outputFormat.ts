export interface OutputFormat {
    register(schema: any, topic: string): Promise<void>;

    encode(record: any, topic: string): Promise<Buffer>;
}