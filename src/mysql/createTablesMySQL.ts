import fs from 'fs';
import alert from 'cli-alerts';

export default async function createTablesMySQL(schema: any, initialSchemaPath: string, connection): Promise<void> {
    for (const tableSchema of schema) {
        const topicParts = tableSchema._meta.topic.split('.');
        const tableName = topicParts.pop();
        const schemaName = topicParts.join('.');

        // In MySQL, schema and database are synonymous, so we'll ensure the database exists
        if (schemaName) {
            try {
                await connection.query(`CREATE DATABASE IF NOT EXISTS ${schemaName};`);
                await connection.changeUser({database: schemaName});
                alert({
                    type: `success`,
                    name: `Created or confirmed existence of database ${schemaName}!`,
                    msg: ``
                });
            } catch (error) {
                alert({
                    type: `error`,
                    name: `Error creating MySQL database, try creating it manually...`,
                    msg: `\n  ${error.message}`
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
            if (global.recordSize && extendedQuery.toLowerCase().includes('create table')) {
                extendedQuery = extendedQuery.replace(/\);/g, ', recordSizePayload TEXT NULL);');
            }

            try {
                if (extendedQuery) {
                    await connection.query(extendedQuery);
                    console.log(extendedQuery);
                }
            } catch (error) {
                alert({
                    type: `error`,
                    name: `Error executing MySQL query:`,
                    msg: `\n  ${error.message}`
                });
            }
        }

        alert({
            type: `success`,
            name: `Created tables in MySQL!`,
            msg: ``
        });
    } catch (error) {
        alert({
            type: `error`,
            name: `Error creating MySQL tables, try creating them manually...`,
            msg: `\n  ${error.message}`
        });
    }
}
