#!/usr/bin/env node

/**
 * Fake Data Generator
 * Materialize CLI app
 *
 * @author Bobby Iliev <https://github.com/bobbyiliev>
 */
const end = require('./src/utils/end');
const alert = require('cli-alerts');

const { parseSqlSchema } = require('./src/schemas/parseSqlSchema');
const { parseAvroSchema } = require('./src/schemas/parseAvroSchema');
const { parseJsonSchema } = require('./src/schemas/parseJsonSchema');
const cleanKafka  = require('./src/kafka/cleanKafka');
const dataGenerator = require('./src/dataGenerator');
const fs = require('fs');
const { program, Option } = require('commander');

program.name('datagen').description('Fake Data Generator').version('0.1.1');

program
    .addOption(
        new Option('-f, --format <char>', 'The format of the produced data')
            .choices(['json', 'avro'])
            .default('json')
    )
    .requiredOption('-s, --schema <char>', 'Schema file to use')
    .addOption(
        new Option(
            '-n, --number <char>',
            'Number of records to generate. For infinite records, use -1'
        ).default('10')
    )
    .addOption(
        new Option('-c, --clean <char>')
            .choices(['true', 'false'])
            .default('false')
    )
    .option('-dr, --dry-run', 'Dry run (no data will be produced to Kafka)')
    .option('-d, --debug', 'Output extra debugging information')
    .option('-w, --wait <int>', 'Wait time in ms between record production', parseInt)
    .option('-rs, --record-size <int>', 'Record size in bytes, eg. 1048576 for 1MB', parseInt);

program.parse();

const options = program.opts();

if (!fs.existsSync(options.schema)) {
    alert({
        type: `error`,
        name: `Schema file ${options.schema} does not exist!`,
        msg: ``
    });
    process.exit();
}

global.debug = options.debug;
global.recordSize = options.recordSize;
global.wait = options.wait;
global.clean = options.clean;
global.dryRun = options.dryRun;

if (debug) {
    console.log(options);
}

if (!wait) {
    wait = 0;
}

(async () => {
    let parsedSchema;
    let schemaFile;

    // Parse the schema file
    try {
        // Read the schema file extension
        const schemaFormat = options.schema.split('.').pop();
        switch (schemaFormat) {
            case 'avsc':
                schemaFile = fs.readFileSync(options.schema, 'utf8');
                parsedSchema = await parseAvroSchema(schemaFile);
                break;
            case 'json':
                schemaFile = fs.readFileSync(options.schema, 'utf8');
                parsedSchema = await parseJsonSchema(schemaFile);
                break;
            case 'sql':
                parsedSchema = await parseSqlSchema(options.schema);
                break;
            default:
                alert({
                    type: `error`,
                    name: `Schema file ${options.schema} is not supported!`,
                    msg: `Supported formats are: .avsc, .json, .sql`
                });
                break;
        }
    } catch (error) {
        alert({
            type: `error`,
            name: `Could not parse schema`,
            msg: `\n  ${error.message}`
        });
        process.exit();
    }

    if (clean == 'true') {
        let topics = []
        for (table of parsedSchema){
            topics.push(table._meta.topic)
        }
        await cleanKafka(options.format,topics)
        process.exit(0);
    }

    // Generate data
    await dataGenerator({
        format: options.format,
        schema: parsedSchema,
        number: options.number,
        dryRun: options.dryRun
    })

    await end();

    process.exit(0);
})();
