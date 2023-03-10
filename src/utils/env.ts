import dotenv from 'dotenv';

export class Env {

    static {
        dotenv.config();
    }

    static required(name: string): string {
        const value = process.env[name];
        if (!value) {
            alert({
                type: `error`,
                name: `Missing required environment variable ${name}`
            });
            process.exit(1);
        }

        return value;
    }

    static optional(name: string, orElse: string): string {
        return process.env[name] ?? orElse;
    }
}