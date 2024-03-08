import fs from 'fs';
import alert from 'cli-alerts';

export default async function createTablesMySQL(schema: any, initialSchemaPath: string, connection): Promise<void> {
    let allTablesExist = true;

    for (const tableSchema of schema) {
        const topicParts = tableSchema._meta.topic.split('.');
        const tableName = topicParts.pop();
        const schemaName = topicParts.join('.');

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
                    name: `Error creating MySQL database...`,
                    msg: `\n  ${error.message}`
                });
            }
        }

        try {
            const [rows] = await connection.query(`SHOW TABLES LIKE '${tableName}';`);
            if (rows.length) {
                alert({
                    type: `info`,
                    name: `Table ${tableName} already exists in database ${schemaName}.`,
                    msg: `Skipping table creation.`
                });
            } else {
                allTablesExist = false;
            }
        } catch (error) {
            alert({
                type: `error`,
                name: `Error checking if table ${tableName} exists...`,
                msg: `\n  ${error.message}`
            });
        }
    }

    if (!allTablesExist) {
        try {
            alert({
                type: `info`,
                name: `Running the ${initialSchemaPath} SQL file...`,
                msg: ``
            });
            const initialSchema = fs.readFileSync(initialSchemaPath, 'utf-8');
            const queries = initialSchema.split(';').map(query => query.trim()).filter(query => query);

            for (const query of queries) {
                if (!query) continue; // Skip empty queries

                try {
                    await connection.query(query);
                    console.log(`Executed: ${query}`);
                } catch (error) {
                    alert({
                        type: `error`,
                        name: `Error executing MySQL query:`,
                        msg: `\n  ${error.message}\nQuery: ${query}`
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
                name: `Error creating MySQL tables...`,
                msg: `\n  ${error.message}`
            });
        }
    }
}
