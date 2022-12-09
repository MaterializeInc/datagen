const alert = require('cli-alerts');
var avro = require('avro-js');
const fs = require('fs');
const { faker } = require('@faker-js/faker');

async function prepareAvroData(table) {
	let record = {};
	record[table.tableName] = {};
	await table.columns.forEach(column => {
		if (column.constraint_type === 'primary key') {
			return;
		}
		switch (column.definition.dataType.toLowerCase()) {
			case 'string':
				record[table.tableName][column.column.column] = {
					column: faker.word.adjective()
				};
				break;
			case 'int':
			case 'serial':
			case 'bigint':
				record[table.tableName][column.column.column] =
					faker.datatype.number();
				break;
			case 'text':
				record[table.tableName][column.column.column] =
					faker.lorem.paragraph();
			case 'timestamp':
				record[table.tableName][column.column.column] =
					faker.date.past();
				break;
			default:
				record[table.tableName][column.column.column] =
					faker.word.adjective();
				break;
		}
	});
	return record;
}

async function parseAvroSchema ( schemaFile ) {

    alert({
		type: `success`,
		name: `Parsing Avro schema...`,
		msg: ``
	});

    var parsedSchema = avro.parse(schemaFile);

    console.log(parsedSchema);

};

exports.parseAvroSchema = parseAvroSchema;
exports.prepareAvroData = prepareAvroData;
