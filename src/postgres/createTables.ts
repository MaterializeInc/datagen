import fs from 'fs';
import postgresConfig from './postgresConfig.js';
import alert from 'cli-alerts';

export default async function createTables(schema: any, initialSchemaPath: string): Promise<void> {
    const client = await postgresConfig();

    for (const tableSchema of schema) {
        const topicParts = tableSchema._meta.topic.split('.');
        const tableName = topicParts.pop();
        const schemaName = topicParts.join('.');

        // Check if schema exists and create if it doesn't
        if (schemaName) {
            const schemaExists = await client.query(`SELECT EXISTS (
                SELECT schema_name
                FROM   information_schema.schemata
                WHERE  schema_name = '${schemaName}'
            );`);

            if (!schemaExists.rows[0].exists) {
                try {
                    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
                    alert({
                        type: `success`,
                        name: `Created schema!`,
                        msg: ``
                    });
                } catch (error) {
                    alert({
                        type: `error`,
                        name: `Error creating PostgreSQL schema, try creating it manually...`,
                        msg: `\n  ${error.message}`
                    });
                }
            } else {
                alert({
                    type: `info`,
                    name: `Schema ${schemaName} already exists!`,
                    msg: ``
                });
            }
        }
    }

    // Read initial schema SQL file and execute it
    try {
        alert({
            type: `info`,
            name: `Running the ${initialSchemaPath} SQL file...`,
            msg: ``
        });
        const initialSchema = fs.readFileSync(initialSchemaPath, 'utf-8');
        const queries = initialSchema.split(';');

        for (const query of queries) {
            let extendedQuery = query.trim();
            // Add ; to the end of the query if it's missing
            if (!extendedQuery.endsWith(';')) {
                extendedQuery += ';';
            }
            // If the global option is enabled, add the recordSizePayload column to the table creation query
            if (global.recordSize && extendedQuery.toLowerCase().startsWith('create table')) {
                extendedQuery = extendedQuery.replace(/\);/g, ', recordSizePayload TEXT NULL);');
            }

            try {
                if (extendedQuery) {
                    const correctedSql = extendedQuery.replace(/`/g, '"').replace(/COMMENT '.*'/g, '').replace(/datetime/g, 'timestamp');
                    await client.query(correctedSql);
                    console.log(correctedSql);
                }
            } catch (error) {
                alert({
                    type: `error`,
                    name: `Error executing query:`,
                    msg: `\n  ${error.message}`
                });
            }
        }

        alert({
            type: `success`,
            name: `Created tables!`,
            msg: ``
        });
    } catch (error) {
        alert({
            type: `error`,
            name: `Error creating PostgreSQL tables, try creating them manually...`,
            msg: `\n  ${error.message}`
        });
    }

    await client.end();
}
