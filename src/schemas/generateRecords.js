const fs = require('fs');
const { faker } = require('@faker-js/faker');
const alert = require('cli-alerts');


function generateRandomRecord(fakerRecord, generatedRecord = {}){
    for (const field in fakerRecord){
        if (field in generatedRecord){
            continue
        }
        if (typeof fakerRecord[field] === 'object'){
            generatedRecord[field] = generateRandomRecord(fakerRecord[field])
        } else {
            try {
                const [fakerMethod, fakerProperty] = fakerRecord[field].split('.');
                generatedRecord[field] = faker[fakerMethod][fakerProperty]();
            } catch (error) {
                alert({
                    type: `error`,
                    name: `Faker Error`,
                    msg: `${error.message}\n${JSON.stringify(generatedRecord,null,2)}`
                });
                process.exit();
            }
        }

    }
    return generatedRecord;
}


function generateRecords(schema) {
    // goal is to return a "mega record" with structure
    // {topic: [list of records to send to Kafka]}
    // where the records obey the relationships specified in tests/schema.json
    let megaRecord = {}
    for (const table of schema) {
        const {_meta, ...fakerRecord} = table;

        // populate the initial record for the topic
        if (!megaRecord[_meta.topic]){
            megaRecord[_meta.topic] = [];
            let newRecord = generateRandomRecord(fakerRecord);
            megaRecord[_meta.topic].push(newRecord);
        }

        // for records that already exist, generate values
        // for every field that doesn't already have a value.
        for (existingRecord of megaRecord[_meta.topic]){
            existingRecord = generateRandomRecord(fakerRecord, existingRecord);
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
        const {_meta, ...fakerRecord} = table;
        for (existingRecord of megaRecord[_meta.topic]){
            existingRecord = generateRandomRecord(fakerRecord, existingRecord);
        }
    }
    return megaRecord;
}



// Read the contents of the file as a string
const jsonString = fs.readFileSync('./tests/schema.json', 'utf-8');

// Parse the JSON string into a JavaScript object
const json = JSON.parse(jsonString);

let megaRecord = JSON.stringify(generateRecords(json),null,2)

fs.writeFileSync('megarecord.json', megaRecord)
