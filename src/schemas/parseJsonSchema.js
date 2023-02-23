const alert = require('cli-alerts');

async function parseJsonSchema(schemaFile) {
    alert({
        type: `success`,
        name: `Parsing JSON schema...`,
        msg: ``
    });

    if (debug === 'true') {
        const parsed = JSON.parse(schemaFile);
        console.log(parsed);
    }

    parsed = JSON.parse(schemaFile);
    if (!Array.isArray(parsed)) {
        parsed = [parsed];
    }

    return parsed;
}


exports.parseJsonSchema = parseJsonSchema;
