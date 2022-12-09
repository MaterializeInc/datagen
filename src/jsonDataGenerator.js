const alert = require('cli-alerts');
const fs = require('fs');
const createTopic = require('./kafka/createTopic');
const jsonProducer = require('./kafka/jsonProducer');
const { prepareSqlData  } = require('./schemas/parseSqlSchema');
const { prepareAvroData  } = require('./schemas/parseAvroSchema');

async function* asyncGenerator(records) {
	let i = 0;
	for (i; i < records; i++) {
		yield i;
	}
}

module.exports = async (schema, records, schemaFormat) => {
	alert({
		type: `success`,
		name: `Creating Kafka topic...`,
		msg: ``
	});

	try {
		await createTopic();
		await new Promise(resolve => setTimeout(resolve, 1000));
	} catch (error) {
		alert({
			type: `error`,
			name: `Error creating Kafka topic, try creating it manually...`,
			msg: `\n  ${error.message}`
		});
		process.exit(1);
	}

	alert({
		type: `success`,
		name: `Producing records...`,
		msg: ``
	});

	for await (const record of asyncGenerator(records)) {
		await Promise.all(
			schema.map(async table => {
                let record;
                switch (schemaFormat) {
                    case 'avro':
                        // record = await prepareAvroData(table);
                        break;
                    case 'json':
                        //
                        break;
                    case 'sql':
                        record = await prepareSqlData(table);
                        break;
                    default:
                        break;
                }
				await jsonProducer(record);
			})
		);
		await new Promise(resolve => setTimeout(resolve, 500));
	}
};
