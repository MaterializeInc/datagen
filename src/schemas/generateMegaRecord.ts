import { faker } from '@faker-js/faker';
import alert from 'cli-alerts';

export async function generateRandomRecord(fakerRecord: any, generatedRecord: any = {}){
    // helper function to generate a record from json schema with faker data
    for (const field in fakerRecord) {
        if (field in generatedRecord) {
            continue
        }
        if (typeof fakerRecord[field] === 'object') {
            generatedRecord[field] = await generateRandomRecord(fakerRecord[field])
        } else {
            if (fakerRecord[field] === 'iteration.index'){
                generatedRecord[field] = global.iterationIndex + 1;
                continue;
            }
            try {
                const [fakerMethod, ...property] = fakerRecord[field].split('.');
                const fakerProperty = property.join('.');
                if (fakerProperty.includes('(')) {
                    const property = fakerProperty.split('(')[0];
                    let args = fakerProperty.split('(')[1].split(')')[0];

                    if (!args.includes('{')) {
                        args = !isNaN(args) ? Number(args) : args === 'true' ? true : args === 'false' ? false : args;
                    } else {
                        try {
                            args = JSON.parse(args);
                        } catch (error) {
                            alert({
                                type: `error`,
                                name: `JSON parse error`,
                                msg: `${error.message}\n${JSON.stringify(generatedRecord, null, 2)}`
                            });
                        }
                    }
                    generatedRecord[field] = faker[fakerMethod][property](args);
                } else {
                    generatedRecord[field] = faker[fakerMethod][fakerProperty]();
                }

            } catch (error) {
                alert({
                    type: `error`,
                    name: `Faker Error`,
                    msg: `${error.message}\n${JSON.stringify(generatedRecord, null, 2)}`
                });
                process.exit();
            }
        }

    }
    return generatedRecord;
}

export async function generateMegaRecord(schema: any) {
    // goal is to return a "mega record" with structure
    // {topic: {key: the topic key field name, records: [list of records to send to Kafka]}
    // where the records obey the relationships specified in the input schema file
    let megaRecord = {} as any;
    for (const table of schema) {
        const { _meta, ...fakerRecord } = table;
        let topic = _meta.topic;
        if (global.prefix) {
            topic = `${global.prefix}_${topic}`
        }

        // populate the initial record for the topic
        if (!megaRecord[topic]) {
            megaRecord[topic] = { "key": null, "records": [] };
            let newRecord = await generateRandomRecord(fakerRecord);
            megaRecord[topic].records.push(newRecord);
        }

        // specify the key field for the topic
        if ("key" in _meta) {
            megaRecord[topic]["key"] = _meta.key;
        } else {
            megaRecord[topic]["key"] = null;
            alert({
                type: `warn`,
                name: `No key specified. Using null key`,
                msg: ``
            });
        }

        // for records that already exist, generate values
        // for every field that doesn't already have a value.
        megaRecord[topic]["key"] = _meta.key
        for (let existingRecord of megaRecord[topic]["records"]){
            existingRecord = await generateRandomRecord(fakerRecord, existingRecord);
        }


        if (_meta.relationships) {
            for (const relationship of _meta.relationships) {
                let relatedTopic = relationship.topic;
                if (global.prefix) {
                    relatedTopic = `${global.prefix}_${relatedTopic}`
                }
                // for every existing record, generate "records_per"
                // number of new records for the dependent topic
                for (const existingRecord of megaRecord[topic].records) {
                    for (let i = 1; i <= relationship.records_per; i++) {
                        let newRecord = {}
                        // ensure the new record obeys the foriegn key constraint
                        // specified in the relationship
                        newRecord[relationship.child_field] = existingRecord[relationship.parent_field]
                        if (!megaRecord[relatedTopic]) {
                            megaRecord[relatedTopic] = { "key": _meta.key, "records": [] }
                        }
                        megaRecord[relatedTopic].records.push(newRecord);
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
        let topic = _meta.topic;
        if (global.prefix) {
            topic = `${global.prefix}_${topic}`;
        }
        for (let existingRecord of megaRecord[topic].records){
            existingRecord = await generateRandomRecord(fakerRecord, existingRecord);
        }
    }
    return megaRecord;
}
