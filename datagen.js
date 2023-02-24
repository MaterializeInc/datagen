#!/usr/bin/env node

/**
 * Fake Data Generator
 * Materialize CLI app
 *
 * @author Bobby Iliev <https://github.com/bobbyiliev>
 */

const cli = require('./src/utils/cli');
const end = require('./src/utils/end');
const alert = require('cli-alerts');

const { parseSqlSchema } = require('./src/schemas/parseSqlSchema');
const { parseAvroSchema } = require('./src/schemas/parseAvroSchema');
const { parseJsonSchema } = require('./src/schemas/parseJsonSchema');
const jsonDataGenerator = require('./src/dataGenerator');
const fs = require('fs');
const { program, Option } = require('commander');

program.name('datagen').description('Fake Data Generator').version('0.0.1');

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
        new Option('-d, --debug <char>')
            .choices(['true', 'false'])
            .default('false')
    )
    .addOption(
        new Option('-dr, --dry-run <char>', 'Dry run (no data will be produced')
            .choices(['true', 'false'])
            .default('false')
    )
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

if (debug === 'true') {
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

    // Generate data
    await jsonDataGenerator({
        format: options.format,
        schema: parsedSchema,
        number: options.number,
        dryRun: options.dryRun,
        debug: options.debug
    })

    await end();

    process.exit(0);
})();
