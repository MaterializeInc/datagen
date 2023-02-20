const alert = require('cli-alerts');
const { Parser } = require('node-sql-parser');
const fs = require('fs');
const { faker } = require('@faker-js/faker');

async function prepareSqlData(table) {
    let record = {};
    await table.columns.forEach(column => {
        if (column.constraint_type === 'primary key') {
            return;
        }
        // Check if the column has a comment with a faker method
        if (column.comment && column.comment.value && column.comment.value.value) {
            const [fakerMethod, fakerProperty] = column.comment.value.value.split('.');
            // Check if the faker function exists
            if (faker[fakerMethod][fakerProperty] && typeof faker[fakerMethod][fakerProperty] === 'function') {
                record[column.column.column] = faker[fakerMethod][fakerProperty]();
            } else {
                record = generateDataBasedOnType(column, record);
            }
        } else {
            record = generateDataBasedOnType(column, record);
        }
    });
    return record;
}

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
    return tables;
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
exports.prepareSqlData = prepareSqlData;
exports.getSqlTopicName = getSqlTopicName;
