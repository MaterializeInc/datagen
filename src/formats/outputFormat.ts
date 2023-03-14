export interface OutputFormat {
    register(megaRecord: any): Promise<void>;

    encode(record: any, topic: string): Promise<Buffer>;
}