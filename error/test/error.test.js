'use strict';

const test = require('ava');

const errorGenerator = require('../errorGenerator');

test.serial('Custom Error Should Have Correct Data', (t) => {
    const customErrorConfiguration = {
        name: 'TestError',
        statusCode: 123,
        message: 'Test Error Message'
    };

    const TestError = errorGenerator(customErrorConfiguration, undefined);

    try {
        throw TestError('Modified Error Message');
    } catch (err) {
        t.is(err.name, 'TestError', 'The custom error name is incorrect');
        t.is(err.code, 123, 'The custom error status code is incorrect');
    }
});

test.serial('Custom Error with Empty Transformer Should Use Default Transformer', (t) => {
    const customErrorConfiguration = {
        name: 'EmptyTransformerError',
        statusCode: 123,
        message: 'Test Error Message'
    };

    const EmptyTransformerError = errorGenerator(customErrorConfiguration, {});

    try {
        throw EmptyTransformerError('Modified Error Message');
    } catch (err) {
        t.is(err.name, 'EmptyTransformerError', 'The custom error name is incorrect');
        t.is(err.code, 123, 'The custom error status code is incorrect');
    }
});

test.serial('Duplicate Custom Error Definition Should Go to Cache', (t) => {
    const customErrorConfiguration = {
        name: 'TestError',
        statusCode: 123,
        message: 'Test Error Message'
    };

    const invalidMockErrorTransformer = {
        key: 'value'
    };

    const TestError = errorGenerator(customErrorConfiguration, invalidMockErrorTransformer);

    try {
        throw TestError('Modified Error Message');
    } catch (err) {
        // Should still work correctly, since we're getting from cache
        t.is(err.name, 'TestError', 'The custom error name is incorrect');
        t.is(err.code, 123, 'The custom error status code is incorrect');
    }
});

test.serial('Custom Error Message Getter and Setter Should be Processed Correctly', (t) => {
    const customErrorConfiguration = {
        name: 'CustomError',
        statusCode: 456,
        message: 'Custom Error Message'
    };

    const mockErrorTransformer = {
        getter: function getter() {
            return `${this._message} :Test`;
        },
        setter: function setter(message) {
            this._message = `Test: ${message}`;
        }
    };

    const CustomError = errorGenerator(customErrorConfiguration, mockErrorTransformer);

    try {
        throw CustomError('Modified Error Message');
    } catch (err) {
        t.is(err.name, 'CustomError', 'The custom error name is incorrect');
        t.is(err.code, 456, 'The custom error status code is incorrect');
        t.is(err.message, 'Test: Modified Error Message :Test', 'The custom error message transformer is incorrect');
    }
});
