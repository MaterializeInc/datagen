const fs = require('fs');
const { faker } = require('@faker-js/faker');

function generateFakeValue(fakerStr){
    const [fakerMethod, fakerProperty] = fakerStr.split('.');
    return faker[fakerMethod][fakerProperty]();
}


function generateRecords(schema) {
    // goal is to return a "mega record" with structure
    // {topic: [list of records to send to Kafka]}
    // where the records obey the relationships specified in tests/schema.json
    let megaRecord = {}
    for (const table of schema) {
        const {_meta, ...record} = table;

        // populate the initial record for the topic
        if (!megaRecord[_meta.topic]){
            megaRecord[_meta.topic] = [];
            let newRecord = {};
            for (const field in record){
                newRecord[field] = generateFakeValue(record[field]);
            }
            megaRecord[_meta.topic].push(newRecord);
        }

        // for records that already exist, generate values
        // for every field that doesn't already have a value.
        for (existingRecord of megaRecord[_meta.topic]){
            for (field in record){
                if (!(field in existingRecord)){
                    existingRecord[field] = generateFakeValue(record[field])
                }
            }
        }

        if (_meta.relationships){
            for (const relationship of _meta.relationships) {
                // for every existing record, generate "records_per"
                // number of new records for the dependent topic
                for (const existingRecord of megaRecord[_meta.topic]) {
                    for (let i = 1; i <= relationship.records_per; i++){
                        let newRecord = {}
                        // ensure the new record obeys the foriegn key constraint
                        // specified in the relationship
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

    // At this point, if there were circular relationships, there may be some records with unpopulated fields.
    // We sweep through one more time to make sure all the records have all the fields they need without
    // overriding existing fields that have been populated already.
    for (const table of schema) {
        const {_meta, ...record} = table;
        for (existingRecord of megaRecord[_meta.topic]){
            for (field in record){
                if (!(field in existingRecord)){
                    existingRecord[field] = generateFakeValue(record[field])
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
