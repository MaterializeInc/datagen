const dotenv = require('dotenv');
const inquirer = require('inquirer');
const alert = require('cli-alerts');

module.exports = async client => {
    alert({
        type: `warning`,
        name: `Stopping the data generator`,
        msg: ``
    });
};
