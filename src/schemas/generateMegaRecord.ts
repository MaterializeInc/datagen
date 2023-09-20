import { faker } from '@faker-js/faker';
import alert from 'cli-alerts';
import recordSize from '../utils/recordSize.js';

export async function generateRandomRecord(fakerRecord: any, generatedRecord: any = {}) {
    // helper function to generate a record from json schema with faker data

    for (const field in fakerRecord) {
        if (field in generatedRecord) {
            continue
        }
        if (typeof fakerRecord[field] === 'object') {
            generatedRecord[field] = await generateRandomRecord(fakerRecord[field])
            continue
        }

        if (fakerRecord[field] === 'iteration.index') {
            generatedRecord[field] = global.iterationIndex + 1;
            continue;
        }

        if (fakerRecord[field].match("faker\..*")) {
            try {
                let generatedValue =
                    (new Function(
                        'faker',
                        `return ${fakerRecord[field]};`
                    ))(faker);
                if (generatedValue instanceof Date) {
                    generatedValue = generatedValue.toISOString();
                }
                generatedRecord[field] = generatedValue;
            } catch (error) {
                alert({
                    type: `error`,
                    name: `Faker Error`,
                    msg: `${error.message}\nGenerated record:\n${JSON.stringify(generatedRecord, null, 2)}`
                });
                process.exit(1);
            }
        } else {
            alert({
                type: `error`,
                name: `Faker Error`,
                msg: `Could not parse Faker method. See FakerJS API documentation.\nFailed while parsing:\n${fakerRecord[field]}`
            });
            process.exit(1);
        }
    }
    return generatedRecord;
}


export async function generateMegaRecord(schema: any) {
    // goal is to return a "mega record" with structure
    // {topic: {key: the topic key field name, records: [list of records to send to Kafka]}
    // where the records obey the relationships specified in the input schema file
    const megaRecord = {} as any;
    for (const table of schema) {
        const { _meta, ...fakerRecord } = table;
        let topic = _meta.topic;
        if (global.prefix) {
            topic = `${global.prefix}_${topic}`
        }

        // populate the initial record for the topic
        if (!megaRecord[topic]) {
            megaRecord[topic] = { "key": null, "records": [] };
            const newRecord = await generateRandomRecord(fakerRecord);
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
        for (let existingRecord of megaRecord[topic]["records"]) {
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
                    // ensure the new record obeys the foreign key constraint
                    // specified in the relationship
                    const newRecords = [];
                    const existingValue = existingRecord[relationship.parent_field];
                    if (Array.isArray(existingValue)) {
                        for (let i = 0; i < existingValue.length; i++) {
                            const newRecord = {};
                            newRecord[relationship.child_field] = existingValue[i]
                            newRecords.push(newRecord);
                        }
                    } else {
                        for (let i = 1; i <= relationship.records_per; i++) {
                            const newRecord = {};
                            newRecord[relationship.child_field] = existingValue;
                            newRecords.push(newRecord);
                        }
                    }
                    if (!megaRecord[relatedTopic]) {
                        megaRecord[relatedTopic] = { "key": _meta.key, "records": [] };
                    }
                    megaRecord[relatedTopic].records.push(...newRecords);
                }
            }
        }
    }

    // At this point, if there were circular relationships, there may be some records with unpopulated fields.
    // We sweep through one more time to make sure all the records have all the fields they need without
    // overriding existing fields that have been populated already.
    for (const table of schema) {
        const { _meta, ...fakerRecord } = table;
        let topic = _meta.topic;
        if (global.prefix) {
            topic = `${global.prefix}_${topic}`;
        }
        for (let existingRecord of megaRecord[topic].records) {
            existingRecord = await generateRandomRecord(fakerRecord, existingRecord);
        }
    }

    if (global.recordSize) {
        for (const topic in megaRecord) {
            let payload: string = await recordSize();
            for (let record of megaRecord[topic].records) {
                record["recordSizePayload"] = payload;
            }
        }
    }

    return megaRecord;
}
