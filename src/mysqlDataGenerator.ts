import alert from 'cli-alerts';
import { generateMegaRecord } from './schemas/generateMegaRecord.js';
import mysqlConfig from './mysql/mysqlConfig.js';
import createTablesMySQL from './mysql/createTablesMySQL.js';
import sleep from './utils/sleep.js';
import asyncGenerator from './utils/asyncGenerator.js';

export default async function mysqlDataGenerator({
    schema,
    iterations,
    initialSchema
}: {
    schema: string;
    iterations: number;
    initialSchema: string;
}): Promise<void> {
    // Database client setup
    let connection = null;
    if (global.dryRun) {
        alert({
            type: `info`,
            name: `Debug mode: skipping database connection...`,
            msg: ``
        });
    } else {
        connection = await mysqlConfig();
    }

    for await (const iteration of asyncGenerator(iterations)) {
        global.iterationIndex = iteration;
        const megaRecord = await generateMegaRecord(schema);

        if (iteration === 0) {
            if (global.debug && global.dryRun) {
                alert({
                    type: `success`,
                    name: `Dry run: Skipping table creation...`,
                    msg: ``
                });
            } else {
                alert({
                    type: `info`,
                    name: `Creating tables...`,
                    msg: ``
                });
                connection && (await createTablesMySQL(schema, initialSchema, connection));
            }
        }

        for (const table in megaRecord) {
            for await (const record of megaRecord[table].records) {
                console.log(
                    `\n  Table: ${table} \n  Record: ${JSON.stringify(record)}`
                );

                let key = null;
                if (record[megaRecord[table].key]) {
                    key = record[megaRecord[table].key];
                }

                if (global.dryRun) {
                    alert({
                        type: `success`,
                        name: `Dry run: Skipping record production...`,
                        msg: `\n  Table: ${table} \n  Record key: ${key} \n  Payload: ${JSON.stringify(
                            record
                        )}`
                    });
                }

                if (!global.dryRun) {
                    try {
                        const values = Object.values(record);
                        const placeholders = values.map(() => '?').join(', ');
                        const query = `INSERT INTO ${table} VALUES (${placeholders})`;
                        connection && (await connection.execute(query, values));
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        }

        await sleep(global.wait);
    }

    connection && (await connection.end());
}
