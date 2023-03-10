import alert from 'cli-alerts';

export default function parseJsonSchema(schemaFile: any): Promise<any> {
    alert({
        type: `success`,
        name: `Parsing JSON schema...`,
        msg: ``
    });

    let parsed = JSON.parse(schemaFile);
    if (global.debug) {
        console.log(parsed);
    }

    if (!Array.isArray(parsed)) {
        parsed = [parsed];
    }

    return parsed;
}
