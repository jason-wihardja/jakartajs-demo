'use strict';

const fs = require('fs');
const path = require('path');
const URL = require('url');
const Joi = require('@hapi/joi');
const _ = require('lodash');
const Sequelize = require('sequelize-values')();
const options = require('./options');

const StackGetter = require('../libs/StackGetter');

let configuration = null;
let modelsInitialized = false;
let models = null;

const transactions = new Map();

function validateContext(context) {
    return Joi.object().keys({
        request_id: Joi.string().guid({
            version: ['uuidv4']
        }).required()
    }).required().validateAsync(context, {
        allowUnknown: true
    }).catch((err) => {
        throw new Error('No Context Provided for Transaction');
    });
}

function parseConnectionString(connectionString) {
    if (_.isEmpty(connectionString)) {
        throw new Error('Invalid Connection String');
    }

    const parsed = URL.parse(connectionString);
    const [username, ...password] = parsed.auth.split(':');

    return {
        host: parsed.hostname,
        port: parsed.port,
        username,
        password: password.join(':'),
        database: parsed.path.replace('/', '')
    };
}

exports.ORMProvider = Sequelize;

exports.configure = (config) => {
    const stack = StackGetter();

    const configurationSchema = Joi.object().keys({
        path: Joi.string().required(),
        connection_string_key: Joi.string().required(),
        read_replica_connection_string_key: Joi.string(),
        sync_db: Joi.boolean().default(false),
        directory: Joi.string().default(path.parse(stack[1].getFileName()).dir),
        logger: Joi.any().default(null),
        pool: Joi.object().default({
            min: 0,
            max: 5,
            idle: 10000,
            evict: 10000,
            acquire: 20000
        })
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

    if (modelsInitialized === true) {
        return models;
    }

    models = {};
    const sequelizeOptions = options(configuration);

    if (process.env[configuration.read_replica_connection_string_key]) {
        Object.assign(sequelizeOptions, {
            replication: {
                write: parseConnectionString(process.env[configuration.connection_string_key]),
                read: process.env[configuration.read_replica_connection_string_key].split('|||').map(parseConnectionString)
            }
        });
    } else {
        Object.assign(sequelizeOptions, parseConnectionString(process.env[configuration.connection_string_key]));
    }

    const sequelize = new Sequelize(sequelizeOptions);

    fs.readdirSync(path.join(configuration.directory, configuration.path)).filter((file) => {
        return (file.indexOf('.') !== 0) && (path.extname(file) === '.js') && (file !== 'index.js');
    }).forEach((file) => {
        const model = sequelize.import(path.join(configuration.directory, configuration.path, file));
        models[model.name] = model;
    });

    for (const modelName in models) {
        if ('associate' in models[modelName]) {
            models[modelName].associate(models);
        }
    }

    models.context = sequelize;
    modelsInitialized = true;

    if (configuration.sync_db === true) {
        await sequelize.sync({
            force: false
        });
    }

    return models;
};

exports.getInstance = () => exports.getContext();

exports.startTransaction = async (context = null) => {
    const ctx = await validateContext(context);

    if (modelsInitialized === false) {
        await exports.getContext();
    }

    const transaction = await models.context.transaction({
        isolationLevel: models.context.Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED
    });

    transactions.set(ctx.request_id, transaction);

    return transaction;
};

exports.getTransaction = async (context = null) => {
    const ctx = await validateContext(context);

    if (transactions.has(ctx.request_id) === false) {
        throw new Error('Invalid Request ID for Transaction');
    }

    return transactions.get(ctx.request_id);
};

exports.commit = async (context = null) => {
    const ctx = await validateContext(context);

    if (transactions.has(ctx.request_id) === false) {
        throw new Error('Invalid Request ID for Transaction');
    }

    await (await exports.getTransaction(context)).commit();
    transactions.delete(ctx.request_id);
};

exports.rollback = async (context = null) => {
    const ctx = await validateContext(context);

    if (transactions.has(ctx.request_id) === false) {
        throw new Error('Invalid Request ID for Transaction');
    }

    await (await exports.getTransaction(context)).rollback();
    transactions.delete(ctx.request_id);
};

exports.closeContext = async () => {
    if (models && models.context) {
        const result = await models.context.close();
        transactions.clear();
        models = null;
        modelsInitialized = false;
        return result;
    }

    return null;
};

module.exports = exports;
