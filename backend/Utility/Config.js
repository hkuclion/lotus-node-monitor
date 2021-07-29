const path = require('path')
const fs = require('fs')

let Config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'config.json'), {encoding:"utf8"}));

module.exports = Config;