import alert from 'cli-alerts';
import mysqlDataGenerator from './mysqlDataGenerator.js';
import kafkaDataGenerator from './kafkaDataGenerator.js';
import postgresDataGenerator from './postgresDataGenerator.js';
import webhookDataGenerator from './webhookDataGenerator.js';

interface GeneratorOptions {
    format: string;
    schema: string;
    iterations: number;
    initialSchema: string;
}

export default async function dataGenerator({
    format,
    schema,
    iterations,
    initialSchema
}: GeneratorOptions): Promise<void> {
    try {
        switch (format) {
            case 'postgres':
                if (!initialSchema.endsWith('.sql')) {
                    alert({
                        type: `error`,
                        name: `Producing SQL data is only supported with SQL schema files!`,
                        msg: ``
                    });
                    process.exit(1);
                }

                await postgresDataGenerator({ schema, iterations, initialSchema });
                break;
            case 'mysql':
                if (!initialSchema.endsWith('.sql')) {
                    alert({
                        type: `error`,
                        name: `Producing SQL data is only supported with SQL schema files!`,
                        msg: ``
                    });
                    process.exit(1);
                }

                await mysqlDataGenerator({ schema, iterations, initialSchema });
                break;
            case 'webhook':
                await webhookDataGenerator({ schema, iterations, initialSchema });
                break;
            default:
                await kafkaDataGenerator({ format, schema, iterations, initialSchema });
                break;
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
};
