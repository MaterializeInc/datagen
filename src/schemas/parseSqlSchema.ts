import alert from 'cli-alerts';
import fs from 'fs';
import pkg from 'node-sql-parser';
const { Parser } = pkg;

export async function parseSqlSchema(schemaFile: any) {
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
    // @ts-ignore
    parsedSchema.ast.forEach((table: { table: ({ [s: string]: unknown; } | ArrayLike<unknown>)[]; create_definitions: any[]; }) => {
        const schema = {
            tableName: Object.values(table.table[0])
                .filter(x => x)
                .join('.'),
            columns: []
        };
        table.create_definitions.forEach(column => {
            schema.columns.push(column);
        });
        // @ts-ignore
        tables.push(schema);
    });

    // Convert the schema to JSON
    tables = await convertSqlSchemaToJson(tables);

    if (global.debug) {
        console.log(tables, null, 3);
    }

    return tables;
}

export async function convertSqlSchemaToJson(tables: Array<any>) {
    const jsonSchema = [];
    tables.forEach(table => {
        const schema = {
            _meta: {
                topic: table.tableName
            }
        };
        table.columns.forEach(column => {
            if (column.unique_or_primary === 'primary key') {
                schema._meta['key'] = column.column.column;
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
                        schema[column.column.column] = 'faker.datatype.string()';
                        break;
                    case 'int':
                    case 'serial':
                    case 'bigint':
                        schema[column.column.column] = 'faker.datatype.number()';
                        break;
                    case 'text':
                        schema[column.column.column] = 'faker.datatype.string()';
                        break;
                    case 'timestamp':
                        schema[column.column.column] = 'faker.datatype.datetime()';
                        break;
                    default:
                        schema[column.column.column] = 'faker.datatype.string()';
                        break;
                }
            }
        });
        // @ts-ignore
        jsonSchema.push(schema);
    });

    return jsonSchema;
}

export async function getSqlTopicName(schemaFile) {
    if (schemaFile.tableName) {
        return schemaFile.tableName;
    }
    return 'datagen_test_topic';
}
