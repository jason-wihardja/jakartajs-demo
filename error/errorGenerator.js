'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const S = require('string');

const cache = {};

const getFunctionDefinition = (templateValues) => {
    if (!cache.errorTemplate) {
        cache.errorTemplate = fs.readFileSync(path.join(__dirname, 'errorTemplate.js'), 'utf8');
    }

    const functionDefinition = S(cache.errorTemplate)

        // Replace Template Name
        .replaceAll('ErrorTemplate', '{{name}}')
        .replaceAll('DefaultMessage', '{{message}}')
        .replaceAll("'DefaultStatusCode'", '{{statusCode}}')
        .replaceAll('DefaultDirectory', '{{directory}}')
        .ensureLeft('return ')

        // Convert to String
        .toString();

    return S(functionDefinition).template(templateValues).toString();
};

module.exports = function exported(error, ErrorTransformer) {
    if (cache[error.name]) {
        return cache[error.name];
    }

    let messageGetter = function messageGetter() {
        return this._message;
    };

    let messageSetter = function messageSetter(message) {
        this._message = message;
    };

    const templateValues = {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        directory: path.basename(process.cwd())
    };

    if (ErrorTransformer) {
        if (ErrorTransformer.getter) {
            messageGetter = ErrorTransformer.getter;
        }

        if (ErrorTransformer.setter) {
            messageSetter = ErrorTransformer.setter;
        }
    }

    const functionDefinition = getFunctionDefinition(templateValues);

    const CustomError = Function('getMessage, setMessage', functionDefinition)(messageGetter, messageSetter);
    util.inherits(CustomError, Error);

    cache[error.name] = CustomError;

    return CustomError;
};
