const fs = require('fs');
const { faker } = require('@faker-js/faker');

function generateKeySpace(schema) {
    const cardinality = 100;
    const keySpace = {};

    for (const table of schema) {

        const { _meta, ...columns } = table;


        if (!(_meta.topic in keySpace))
        keySpace[_meta.topic]= {
            "cardinality": cardinality,
            "key_faker": columns[_meta.key],
            "unique_keys": new Set()
        };



        if (_meta.relationships) {

            if (!_meta.key) {
                alert({
                    type: `error`,
                    name: `Expecting a "key" entry in _meta for topic ${_meta.topic}`,
                    msg: `\n  ${error.message}`
                });
                process.exit(0);
            }

            for (const relationship of _meta.relationships) {
                if (!(relationship.topic in keySpace)){    
                    keySpace[relationship.topic] = {
                        "cardinality": keySpace[_meta.topic].cardinality * relationship.records_per,
                        "key_faker": relationship.field,
                        "unique_keys": new Set()
                    }
                }
            }
        }


        if (keySpace[_meta.topic].unique_keys.size === 0){
            const [fakerMethod, fakerProperty] = columns[_meta.key].split('.');
            for (let i = 1; i <= keySpace[_meta.topic].cardinality; i++) {
                keySpace[_meta.topic].unique_keys.add(faker[fakerMethod][fakerProperty]());
            }
            // if (_meta.relationships) {
            //     for (const relationship of _meta.relationships) {
            //         const [fakerMethod, fakerProperty] = keySpace[relationship.topic].key_faker.split('.');
            //         keySpace[relationship.topic].unique_keys.add(faker[fakerMethod][fakerProperty]());
            //     }
            // }
        }

    }


    return keySpace;
}



// Read the contents of the file as a string
const jsonString = fs.readFileSync('./tests/schema.json', 'utf-8');

// Parse the JSON string into a JavaScript object
const json = JSON.parse(jsonString);

let result = generateKeySpace(json)

// Use the parsed JSON object
console.log(result);
