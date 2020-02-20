'use strict';

const Joi = require('@hapi/joi');
const mongodb = require('mongodb');

let configuration = null;
let mongoClient = null;
let dbName = null;

exports.ObjectID = mongodb.ObjectID;

exports.configure = (config) => {
    const configurationSchema = Joi.object().keys({
        connection_string_key: Joi.string().required(),
        db_name: Joi.string().default(null)
    });

    const validation = configurationSchema.validate(config);

    if (validation.error) {
        throw validation.error;
    } else {
        configuration = validation.value;
    }
};

exports.getContext = async () => {
    if (configuration === null) {
        throw new Error('Not Configured');
    }

    if (mongoClient) {
        return mongoClient;
    }

    const connectionString = process.env[configuration.connection_string_key];
    if (configuration.db_name) {
        dbName = configuration.db_name;
    } else {
        [dbName] = connectionString.split('/').splice(-1).shift().split('?');
    }

    mongoClient = mongodb.MongoClient.connect(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then((client) => {
        mongoClient = client;
        return client;
    }).catch((err) => {
        mongoClient = null;
        throw err;
    });

    return mongoClient;
};

exports.getInstance = () => exports.getContext().then(client => client.db(dbName));

exports.closeContext = async () => {
    if (mongoClient) {
        await mongoClient.close();
        mongoClient = null;
        dbName = null;
    }

    return null;
};

module.exports = exports;
