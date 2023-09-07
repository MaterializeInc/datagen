import alert from 'cli-alerts';
import crypto from 'crypto';
import * as pg from 'pg';
import { generateMegaRecord } from './schemas/generateMegaRecord.js';
import { OutputFormat } from './formats/outputFormat.js';
import sleep from './utils/sleep.js';
import asyncGenerator from './utils/asyncGenerator.js';
import webhookConfig from './webhook/webhookConfig.js';

export default async function webhookDataGenerator({
    schema,
    iterations,
    initialSchema
}: {
    schema: string;
    iterations: number;
    initialSchema: string;
}): Promise<void> {

    // Webhook client setup
    let client = null;
    if (global.dryRun) {
        alert({
            type: `info`,
            name: `Debug mode: skipping Webhook connection...`,
            msg: ``
        });
        client = {
            url: "dry_run_url",
            timeout: "dry_run_timeout",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': "dry_run_secret",
            }
        };
    } else {
        client = await webhookConfig();
    }

    let payload: string;

    for await (const iteration of asyncGenerator(iterations)) {
        global.iterationIndex = iteration;
        const megaRecord = await generateMegaRecord(schema);

        if (iteration === 0) {
            if (global.debug && global.dryRun) {
                alert({
                    type: `success`,
                    name: `Dry run: Skipping client configuration...`,
                    msg: ``
                });
            }
        }

        const handler = async (megaRecord: any, iteration: number) => {
            for (const endpoint in megaRecord) {
                for await (const record of megaRecord[endpoint].records) {
                    if (global.dryRun) {
                        alert({
                            type: `success`,
                            name: `Dry run: Skipping record send...`,
                            msg: `\n  Webhook: ${client.url} \n  Payload: ${JSON.stringify(record)}`
                        });
                    } else {
                        try {
                            alert({
                                type: `info`,
                                name: `Sending payload to webhook...`,
                                msg: `\n  Webhook: ${client.url} \n  Payload: ${JSON.stringify(record)}`
                            });

                            const response = await fetch(client.url, {
                                method: 'POST',
                                headers: client.headers,
                                body: JSON.stringify(record)
                            });

                            alert({
                                type: response.ok ? `success` : `error`,
                                name: `Webhook response:`,
                                msg: `\n  Status: ${response.status} ${response.statusText}`
                            });

                        } catch (error) {
                            console.error('Error sending data to webhook:', error);
                        }
                    }
                }
            }
        };

        // Call the handler function here
        await handler(megaRecord, iteration);

        await sleep(global.wait);
    }

    if (global.dryRun) {
        alert({
            type: `success`,
            name: `Dry run: Skipping client disconnection...`,
            msg: ``
        });
    }

}
