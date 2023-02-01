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
const jsonDataGenerator = require('./src/jsonDataGenerator');
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
            '-sf, --schema-format <char>',
            'The format of the schema file'
        )
            .choices(['json', 'avro', 'sql'])
            .default('sql')
    )
    .addOption(
        new Option(
            '-n, --number <char>',
            'Number of records to generate'
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
    );

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

if (options.debug === 'true') {
    global.debug = true;
    console.log(options);
}

(async () => {
    let parsedSchema;
    let schemaFile;

    // Parse the schema file
    try {
        switch (options.schemaFormat) {
            case 'avro':
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
    switch (options.format) {
        case 'avro':
            alert({
                type: `warning`,
                name: `Avro output format not supported yet`,
                msg: ``
            });
            break;
        case 'json':
            await jsonDataGenerator({
                schema: parsedSchema,
                records: options.number,
                schemaFormat: options.schemaFormat,
                dryRun: options.dryRun
            });
            break;
        default:
            // Generate JSON
            break;
    }

    await end();

    process.exit(0);
})();
