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
const jsonDataGenerator = require('./src/jsonDataGenerator');
const fs = require('fs');
const { program, Option } = require('commander');

program.name('datagen').description('Fake Data Generator').version('0.0.1');

program
	.addOption(
		new Option('-f, --format <char>', 'The format of the produced data')
			.choices(['json', 'avro', 'csv'])
			.default('json')
	)
	.requiredOption('-s, --schema <char>', 'Schema file to use')
	.addOption(
		new Option('-sf, --schema-format <char>', 'The format of the schema file')
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
	);

program.parse();

const options = program.opts();

if (!fs.existsSync(options.schema)) {
	console.log(`Schema file ${options.schema} does not exist!`);
	process.exit(1);
}

if (options.debug === 'true') {
	console.log(options);
}

(async () => {
	let parsedSchema;
	try {
		switch (options.schemaFormat) {
			case 'avro':
				const schemaFile = fs.readFileSync(options.schema, 'utf8');
				parsedSchema = await parseAvroSchema(schemaFile);
				process.exit(1);
				break;
			case 'json':
				alert({
					type: `warning`,
					name: `JSON schema format is not supported yet`,
					msg: ``
				});
				process.exit(1);
				break;
			case 'sql':
				parsedSchema = await parseSqlSchema(
					options.schema
				);
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
		process.exit(1);
	}

	switch (options.format) {
		case 'avro':
			alert({
				type: `warning`,
				name: `Avro output format is not supported yet`,
				msg: ``
			});
			process.exit(1);
			break;
		case 'csv':
			alert({
				type: `warning`,
				name: `CSV output format is not supported yet`,
				msg: ``
			});
			process.exit(1);
			break;
		case 'json':
			await jsonDataGenerator(
				parsedSchema,
				options.number,
				options.schemaFormat
			);
			break;
		default:
			// Generate JSON
			break;
	}

	await end();

	process.exit(0);
})();
