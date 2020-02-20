'use strict';

const fs = require('fs');
const path = require('path');

const libs = {};

fs.readdirSync(__dirname).filter((file) => {
    return (file.indexOf('.') !== 0) && (file !== 'index.js');
}).forEach((folder) => {
    const lib = require(path.join(__dirname, folder));
    libs[folder] = lib;
});

module.exports = libs;
