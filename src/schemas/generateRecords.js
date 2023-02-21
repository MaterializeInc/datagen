const fs = require('fs');
const { faker } = require('@faker-js/faker');

function generateFakeValue(fakerStr){
    const [fakerMethod, fakerProperty] = fakerStr.split('.');
    return faker[fakerMethod][fakerProperty]();
}


function generateRecords(schema) {
    let megaRecord = {}
    for (const table of schema) {
        const {_meta, ...record} = table;

        if (!megaRecord[_meta.topic]){
            megaRecord[_meta.topic] = [];
            let newRecord = {};
            for (const field in record){
                newRecord[field] = generateFakeValue(record[field]);
            }
            megaRecord[_meta.topic].push(newRecord);
        }

        for (existingRecord of megaRecord[_meta.topic]){
            for (field in record){
                if (!(field in existingRecord)){
                    existingRecord[field] = generateFakeValue(record[field])
                }
            }
        }

        if (_meta.relationships){
            for (const relationship of _meta.relationships) {
                for (const existingRecord of megaRecord[_meta.topic]) {
                    for (let i = 1; i <= relationship.records_per; i++){
                        let newRecord = {}
                        newRecord[relationship.field] = existingRecord[_meta.key]
                        if (!megaRecord[relationship.topic]) {
                            megaRecord[relationship.topic] = []
                        }
                        megaRecord[relationship.topic].push(newRecord);
                    }
                }
            }
        }
       
    }
    

    return megaRecord;
}



// Read the contents of the file as a string
const jsonString = fs.readFileSync('./tests/schema.json', 'utf-8');

// Parse the JSON string into a JavaScript object
const json = JSON.parse(jsonString);

let megaRecord = generateRecords(json)

for (topic in megaRecord){
    for (record of megaRecord[topic]){
        console.log(topic)
        console.log(record)
    }
}
