const alert = require('cli-alerts');
const { Parser } = require('node-sql-parser');
const fs = require('fs');
const { faker } = require('@faker-js/faker');

async function parseSqlSchema(schemaFile) {
    alert({
        type: `success`,
        name: `Parsing schema...`,
        msg: ``
    });

    const opt = {
        database: 'PostgresQL'
    };
    const parser = new Parser();
    const schema = fs.readFileSync(schemaFile, 'utf8');
    const parsedSchema = parser.parse(schema, opt);

    let tables = [];
    parsedSchema.ast.forEach(table => {
        let schema = {
            tableName: Object.values(table.table[0])
                .filter(x => x)
                .join('.'),
            columns: []
        };
        table.create_definitions.forEach(column => {
            schema.columns.push(column);
        });
        tables.push(schema);
    });

    // Convert the schema to JSON
    tables = await convertSqlSchemaToJson(tables);

    if (debug === 'true') {
        console.log(tables, null, 3);
    }

    return tables;
}

async function convertSqlSchemaToJson(tables) {
    let jsonSchema = [];
    tables.forEach(table => {
        let schema = {
            _meta: {
                topic: table.tableName
            }
        };
        table.columns.forEach(column => {
            if (column.constraint_type === 'primary key') {
                schema._meta['key'] = column.definition[0].column;
                return;
            }
            if (
                column.comment &&
                column.comment.value &&
                column.comment.value.value
            ) {
                schema[column.column.column] = column.comment.value.value;
            } else {
                switch (column.definition.dataType.toLowerCase()) {
                    case 'string':
                        schema[column.column.column] = 'datatype.string';
                        break;
                    case 'int':
                    case 'serial':
                    case 'bigint':
                        schema[column.column.column] = 'datatype.number';
                        break;
                    case 'text':
                        schema[column.column.column] = 'datatype.string';
                        break;
                    case 'timestamp':
                        schema[column.column.column] = 'datatype.datetime';
                        break;
                    default:
                        schema[column.column.column] = 'datatype.string';
                        break;
                }
            }
        });
        jsonSchema.push(schema);
    });

    return jsonSchema;
}

async function getSqlTopicName(schemaFile) {
    if (schemaFile.tableName) {
        return schemaFile.tableName;
    }
    return 'datagen_test_topic';
}

function generateDataBasedOnType(column, record) {
    switch (column.definition.dataType.toLowerCase()) {
        case 'string':
            record[column.column.column] = { column: faker.word.adjective() };
            break;
        case 'int':
        case 'serial':
        case 'bigint':
            record[column.column.column] = faker.datatype.number();
            break;
        case 'text':
            record[column.column.column] = faker.lorem.paragraph();
            break;
        case 'timestamp':
            record[column.column.column] = faker.date.past();
            break;
        default:
            record[column.column.column] = faker.word.adjective();
            break;
    }
    return record;
}

exports.parseSqlSchema = parseSqlSchema;
exports.getSqlTopicName = getSqlTopicName;
