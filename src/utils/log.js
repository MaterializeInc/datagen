const alert = require('cli-alerts');

module.exports = info => {
    alert({
        type: `warning`,
        name: `Skipping a step`,
        msg: ``
    });

    console.log(info);
    console.log();
};
