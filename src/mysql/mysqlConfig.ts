import mysql from 'mysql2/promise';
import { Env } from '../utils/env.js';

export default async function mysqlConfig() {
    const mysqlHost = Env.optional("MYSQL_HOST", "localhost");
    const mysqlPort = Env.optional("MYSQL_PORT", "3306");
    const mysqlUser = Env.optional("MYSQL_USER", "root");
    const mysqlPassword = Env.optional("MYSQL_PASSWORD", "");
    const mysqlDatabase = Env.optional("MYSQL_DB", "test");

    // Create a connection to the MySQL database
    try {
        const connection = await mysql.createConnection({
            host: mysqlHost,
            port: parseInt(mysqlPort),
            user: mysqlUser,
            password: mysqlPassword,
            database: mysqlDatabase,
        });

        // Test the connection
        await connection.connect();
        return connection;
    } catch (err) {
        throw new Error(`Failed to connect to MySQL: ${err.message}`);
    }
}
