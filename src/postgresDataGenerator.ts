import alert from 'cli-alerts';
import crypto from 'crypto';
import * as pg from 'pg';
import { generateMegaRecord } from './schemas/generateMegaRecord.js';
import { OutputFormat } from './formats/outputFormat.js';
import sleep from './utils/sleep.js';
import asyncGenerator from './utils/asyncGenerator.js';
import postgresConfig from './postgres/postgresConfig.js';
import createTables from './postgres/createTables.js';

export default async function postgresDataGenerator({
    schema,
    iterations,
    initialSchema
}: {
    schema: string;
    iterations: number;
    initialSchema: string;
}): Promise<void> {

    // Database client setup
    let client = null;
    if (global.dryRun) {
        alert({
            type: `info`,
            name: `Debug mode: skipping database connection...`,
            msg: ``
        });
    } else {
        client = await postgresConfig();
    }

    let payload: string;

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
                client && await createTables(schema, initialSchema);
            }
        }

        for (const table in megaRecord) {
            for await (const record of megaRecord[table].records) {
                console.log(`\n  Table: ${table} \n  Record: ${JSON.stringify(record)}`);

                let key = null;
                if (record[megaRecord[table].key]) {
                    key = record[megaRecord[table].key];
                }

                if (global.recordSize) {
                    record.recordSizePayload = payload;
                }

                if (global.dryRun) {
                    alert({
                        type: `success`,
                        name: `Dry run: Skipping record production...`,
                        msg: `\n  Table: ${table} \n  Record key: ${key} \n  Payload: ${JSON.stringify(record)}`
                    });
                }

                // Insert record into Postgres
                if (!global.dryRun) {
                    try {
                        const values = Object.values(record);
                        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
                        const query = `INSERT INTO ${table} VALUES (${placeholders})`;
                        client && await client.query(query, values);
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        }

        await sleep(global.wait);
    }

    client && await client.end();
}
