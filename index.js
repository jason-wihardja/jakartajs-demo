'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const uuid = require('uuid');

const DBContext = require('./db_context');
const MongoContext = require('./mongo_context');
const RedisContext = require('./redis_context');

const Handler = require('./handler');

const AppError = require('./error');
AppError.initializeErrors();

async function bootstrap() {
    const loadedEnv = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env'), { encoding: 'utf8' }));
    for (const key in loadedEnv) {
        process.env[key] = loadedEnv[key];
    }

    DBContext.configure({
        connection_string_key: 'DB_CONNECTION_STRING',
        path: 'jakartajs-demo-models',
        sync_db: true
    });

    MongoContext.configure({
        connection_string_key: 'MONGO_CONNECTION_STRING',
        db_name: 'jakartajs_demo_db'
    });

    RedisContext.configure({
        connection_string_key: 'REDIS_CONNECTION_STRING',
        connection_pool: {
            min: 0,
            max: 10
        }
    });
}

async function teardown() {
    return Promise.all([
        DBContext.closeContext(),
        MongoContext.closeContext(),
        RedisContext.closeContext()
    ]);
}

exports.handler = async (event, context) => {
    context.request_id = uuid.v4();
    await bootstrap();

    let result = null;
    let error = null;

    try {
        if (!Handler[event.action]) {
            throw AppError.NotImplemented('No Such Action Defined');
        }

        result = await Handler[event.action](event, context);
    } catch (err) {
        error = err;
        if (!error.code) {
            error = new AppError.InternalServerError(error.message);
        }
    }

    await teardown();

    if (error) {
        throw error;
    }

    return result;
};

module.exports = exports;
