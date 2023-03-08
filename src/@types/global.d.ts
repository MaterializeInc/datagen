declare global {
    namespace NodeJS {
        interface Global {
            debug: boolean;
            recordSize: number;
            wait: number;
            clean: boolean;
            dryRun: boolean;
            prefix: string;
        }
    }
}

export { };
