const { Command } = require('commander');
const { execSync } = require('child_process');

const datagen = args => {
    return execSync(`node ./datagen.js -dr true ${args}`).toString();
};

describe('Test datagen help', () => {
    it('should return help', () => {
        const output = datagen('-h');
        expect(output).toContain('Usage: datagen [options]');
    });
});

describe('Schema Parsing Tests', () => {
    it('should parse avro schema', () => {
        const schema = './tests/schema.avro';
        const output = datagen(`-s ${schema} -sf avro -n 2`);
        expect(output).toContain('Parsing Avro schema...');
        expect(output).toContain('Dry run: Skipping topic creation...');
        expect(output).toContain('Dry run: Skipping record production...');
        expect(output).toContain('Stopping the data generator');
    });
    test('should parse sql schema', () => {
        const schema = './tests/schema.sql';
        const output = datagen(`-s ${schema} -sf sql -n 2`);
        expect(output).toContain('Parsing schema...');
        expect(output).toContain('Dry run: Skipping topic creation...');
        expect(output).toContain('Dry run: Skipping record production...');
        expect(output).toContain('Stopping the data generator');
    });
    test('should parse json schema', () => {
        const schema = './tests/schema.json';
        const output = datagen(`-s ${schema} -sf json -n 2`);
        expect(output).toContain('Parsing JSON schema...');
        expect(output).toContain('Dry run: Skipping topic creation...');
        expect(output).toContain('Dry run: Skipping record production...');
        expect(output).toContain('Stopping the data generator');
    });
});


describe('Test unsupported formats', () => {
    test('should not support avro format output', () => {
        const schema = './tests/schema.avro';
        const output = datagen(`-s ${schema} -sf avro -n 2 -f avro`);
        expect(output).toContain('Avro output format not supported yet');
    });
});

describe('Test missing schema file', () => {
    test('should return error if schema file does not exist', () => {
        const schema = './tests/schema1.avro';
        const output = datagen(`-s ${schema} -sf avro -n 2`);
        expect(output).toContain(`Schema file ${schema} does not exist!`);
    });
});
