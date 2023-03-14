import { OutputFormat } from "./outputFormat";

export class JsonFormat implements OutputFormat {

    register(megaRecord: any): Promise<void> {
        return Promise.resolve();
    }

    encode(record: any, _: string): Promise<Buffer> {
        const value = JSON.stringify(record);
        return Promise.resolve(Buffer.from(value));
    }
}