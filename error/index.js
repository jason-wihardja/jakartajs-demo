'use strict';

const errorGenerator = require('./errorGenerator');

const errors = [
    { name: 'BadRequest', statusCode: 400, message: 'Bad Request' },
    { name: 'NotAuthorized', statusCode: 401, message: 'Not Authorized' },
    { name: 'Forbidden', statusCode: 403, message: 'Forbidden' },
    { name: 'NotFound', statusCode: 404, message: 'Not Found' },
    { name: 'UnprocessableEntity', statusCode: 422, message: 'Unprocessable Entity' },
    { name: 'InternalServerError', statusCode: 500, message: 'Internal Server Error' },
    { name: 'NotImplemented', statusCode: 501, message: 'Not Implemented' },
    { name: 'ServiceUnavailable', statusCode: 503, message: 'Service Unavailable' }
];

exports.errorTemplate = errors;

let ErrorTransformer;

exports.configure = function configure({ handler }) {
    ErrorTransformer = handler.getConfiguration().errorTransformer;
    exports.initializeErrors();
};

exports.initializeErrors = () => {
    errors.forEach((e) => {
        exports[e.name] = errorGenerator(e, ErrorTransformer);
    });
};

module.exports = exports;
