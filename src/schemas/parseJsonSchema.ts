import alert from 'cli-alerts';

export default function parseJsonSchema(schemaFile: any): Promise<any> {
    alert({
        type: `success`,
        name: `Parsing JSON schema...`,
        msg: ``
    });

    if (global.debug) {
        const parsed = JSON.parse(schemaFile);
        console.log(parsed);
    }

    let parsed = JSON.parse(schemaFile);
    if (!Array.isArray(parsed)) {
        parsed = [parsed];
    }

    return parsed;
}
