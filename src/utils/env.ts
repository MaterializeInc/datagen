import dotenv from 'dotenv';
import alert from 'cli-alerts';

export class Env {

    static {
        dotenv.config();
    }

    static required(name: string): string {
        const value = process.env[name];
        if (!value) {
            alert({
                type: `error`,
                name:
                    `Missing required environment variable ${name}\n
                    Provide environment variable inline or export it to your environment.
                    `
            });
            process.exit(1);
        }

        return value;
    }

    static optional(name: string, orElse: string): string {
        const value = process.env[name];
        if (!value && global.debug) {
            alert({
                type: `warning`,
                name: `Environment variables`,
                msg:
                    `\nEnvironment variable ${name} not found.
                    Using default alternative.
                    If you meant to include this environment variable, export it or
                    run this command from a directory with a .env file that includes it.
                    See https://github.com/MaterializeInc/datagen/ for more detail.
                    `
            })
        }
        return value ?? orElse;
    }
}