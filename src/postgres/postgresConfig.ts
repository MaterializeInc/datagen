import pg from 'pg';
import { Env } from '../utils/env.js';
import fs from 'fs';

export default async function postgresConfig() {
    const { Client } = pg;
    const postgresHost = Env.optional("POSTGRES_HOST", "localhost");
    const postgresPort = Env.optional("POSTGRES_PORT", "5432");
    const postgresUser = Env.optional("POSTGRES_USER", "postgres");
    const postgresPassword = Env.optional("POSTGRES_PASSWORD", "postgres");
    const postgresDatabase = Env.optional("POSTGRES_DB", "postgres");
    const sslCaLocation = Env.optional("SSL_CA_LOCATION", null);
    const sslCertLocation = Env.optional("SSL_CERT_LOCATION", null);
    const sslKeyLocation = Env.optional("SSL_KEY_LOCATION", null);

    let ssl;
    if (sslCaLocation && sslCertLocation && sslKeyLocation) {
        if (!fs.existsSync(sslCaLocation) || !fs.existsSync(sslCertLocation) || !fs.existsSync(sslKeyLocation)) {
            throw new Error("SSL files not found");
        }
        ssl = {
            rejectUnauthorized: false,
            ca: fs.readFileSync(sslCaLocation, 'utf-8'),
            key: fs.readFileSync(sslKeyLocation, 'utf-8'),
            cert: fs.readFileSync(sslCertLocation, 'utf-8')
        }
    } else {
        ssl = false;
    }

    const client = new Client({
        host: postgresHost,
        port: parseInt(postgresPort),
        user: postgresUser,
        password: postgresPassword,
        database: postgresDatabase,
        ssl: ssl,
        connectionTimeoutMillis: 10_000
    });

    // Make sure the connection can be established
    try {
        await client.connect();
    } catch (err) {
        throw new Error(`Failed to connect to PostgreSQL: ${err.message}`);
    }

    return client;
};
