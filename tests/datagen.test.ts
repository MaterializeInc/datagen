import { execSync } from 'child_process';

const datagen = args => {
    return execSync(`node ./dist/datagen.js --dry-run ${args}`).toString();
};

describe('Test datagen help', () => {
    it('should return help', () => {
        const output = datagen('-h');
        expect(output).toContain('Usage: datagen [options]');
    });
});

describe('Schema Parsing Tests', () => {
    it('should parse avro schema', () => {
        const schema = './tests/schema.avsc';
        const output = datagen(`-s ${schema} -n 2`);
        expect(output).toContain('Parsing Avro schema...');
        expect(output).toContain('Dry run: Skipping record production...');
        expect(output).toContain('Stopping the data generator');
    });
    it('should parse complex avro schema', () => {
        const schema = './tests/complex-schema.avsc';
        const output = datagen(`-s ${schema} -n 2`);
        expect(output).toContain('Parsing Avro schema...');
        expect(output).toContain('Dry run: Skipping record production...');
        expect(output).toContain('STREET');
        expect(output).toContain('Stopping the data generator');
    });
    test('should parse sql schema', () => {
        const schema = './tests/products.sql';
        const output = datagen(`-s ${schema} -n 2`);
        expect(output).toContain('Parsing schema...');
        expect(output).toContain('Dry run: Skipping record production...');
        expect(output).toContain('Stopping the data generator');
    });
    test('should parse json schema', () => {
        const schema = './tests/schema.json';
        const output = datagen(`-s ${schema} -n 2`);
        expect(output).toContain('Parsing JSON schema...');
        expect(output).toContain('Dry run: Skipping record production...');
        expect(output).toContain('Stopping the data generator');
    });
});


describe('Test missing schema file', () => {
    test('should return error if schema file does not exist', () => {
        const schema = './tests/schema1.avro';
        try {
            const output = datagen(`-s ${schema} -n 2`);
        } catch (error) {
            expect(error.stdout.toString()).toContain(`Schema file ${schema} does not exist!`);
            expect(error.status).toBe(1);
        }
    });
});

describe('Test record size', () => {
    test('should not contain the recordSizePayload if record size is not set', () => {
        const schema = './tests/schema.avsc';
        const output = datagen(`-s ${schema} -n 2`);
        expect(output).not.toContain('recordSizePayload');
    });
    test('should contain the recordSizePayload if record size is set', () => {
        const schema = './tests/schema.avsc';
        const output = datagen(`-s ${schema} -n 2 -rs 100`);
        expect(output).toContain('recordSizePayload');
    });
    test('should contain the recordSizePayload if record size is set in json schema', () => {
        const schema = './tests/schema.json';
        const output = datagen(`-s ${schema} -n 2 -rs 100`);
        expect(output).toContain('recordSizePayload');
    });
    test('should contain the recordSizePayload if record size is set in sql schema', () => {
        const schema = './tests/products.sql';
        const output = datagen(`-s ${schema} -n 2 -rs 100`);
        expect(output).toContain('recordSizePayload');
    });
    test('should contain the recordSizePayload if record size is set with Postgres destinations', () => {
        const schema = './tests/products.sql';
        const output = datagen(`-s ${schema} -f postgres -n 2 -rs 100`);
        expect(output).toContain('recordSizePayload');
    });
});

describe('Test sql output', () => {
    test('should throw error if sql output is used with avro schema', () => {
        const schema = './tests/schema.avsc';
        try {
            const output = datagen(`-s ${schema} -n 2 -f postgres`);
        } catch (error) {
            expect(error.stdout.toString()).toContain(`Producing SQL data is only supported with SQL schema files!`);
            expect(error.status).toBe(1);
        }
    });
    test('should throw error if sql output is used with json schema', () => {
        const schema = './tests/schema.json';
        try {
            const output = datagen(`-s ${schema} -n 2 -f postgres -dr`);
        } catch (error) {
            expect(error.stdout.toString()).toContain(`Producing SQL data is only supported with SQL schema files!`);
            expect(error.status).toBe(1);
        }
    });
    test('should produce sql output', () => {
        const schema = './tests/products.sql';
        const output = datagen(`-s ${schema} -n 2 -f postgres -dr`);
        expect(output).toContain('Parsing schema...');
        expect(output).toContain('Dry run: Skipping record production...');
        expect(output).toContain('Stopping the data generator');
    });
    test('should produce sql output with mysql format', () => {
        const schema = './tests/products.sql';
        const output = datagen(`-s ${schema} -n 2 -f mysql -dr`);
        expect(output).toContain('Parsing schema...');
        expect(output).toContain('Dry run: Skipping record production...');
        expect(output).toContain('Stopping the data generator');
    });
    test('should throw error if mysql output is used with avro schema', () => {
        const schema = './tests/schema.avsc';
        try {
            const output = datagen(`-s ${schema} -n 2 -f mysql`);
        } catch (error) {
            expect(error.stdout.toString()).toContain(`Producing SQL data is only supported with SQL schema files!`);
            expect(error.status).toBe(1);
        }
    });
});

describe('Test Webhook output', () => {
    test('should produce webhook output', () => {
        const schema = './tests/array.json';
        const output = datagen(`-s ${schema} -n 2 -f webhook -dr`);
        expect(output).toContain('Parsing JSON schema...');
        expect(output).toContain('Debug mode: skipping Webhook connection...');
        expect(output).toContain('Dry run: Skipping record send...');
        expect(output).toContain('Stopping the data generator');
    });
});
