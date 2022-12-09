const alert = require('cli-alerts');
const { Parser } = require('node-sql-parser');
const fs = require('fs');
const { faker } = require('@faker-js/faker');

async function prepareSqlData(table) {
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

async function parseSqlSchema ( schemaFile ) {

    alert({
		type: `success`,
		name: `Parsing schema...`,
		msg: ``
	});

    const opt = {
        database: 'PostgresQL',
    }
    const parser = new Parser();
    const schema = fs.readFileSync(schemaFile, 'utf8');
    const parsedSchema = parser.parse(schema, opt);
    let tables = [];
    parsedSchema.ast.forEach((table) => {
        let schema = {
            tableName: table.table[0].table,
            columns: []
        };
        table.create_definitions.forEach((column) => {
            schema.columns.push(column);
        });
        tables.push(schema);
    });
    return tables;

};

exports.parseSqlSchema = parseSqlSchema;
exports.prepareSqlData = prepareSqlData;
