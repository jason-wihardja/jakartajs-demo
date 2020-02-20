'use strict';

const Joi = require('@hapi/joi');
const genericPool = require('generic-pool');
const redis = require('redis');
const PromisifyAll = require('../libs/PromisifyAll');

PromisifyAll(redis.Multi.prototype);

const options = require('./options');

let configuration = null;

let redisClient = null;
let redisPool = null;

exports.configure = (config) => {
    const configurationSchema = Joi.object().keys({
        connection_string_key: Joi.string().required(),
        connection_pool: Joi.alternatives(Joi.object().keys({
            min: Joi.number().integer().min(0).default(options.pool.min),
            max: Joi.number().integer().when('min', {
                is: Joi.number().integer().required(),
                then: Joi.number().integer().greater(Joi.ref('min'))
            }).default(options.pool.max)
        }), Joi.boolean().default(false)).default(null)
    });

    const validation = configurationSchema.validate(config);

    if (validation.error) {
        throw validation.error;
    } else {
        configuration = validation.value;
        if (configuration.connection_pool === true) {
            configuration.connection_pool = options.pool;
        }
    }
};

exports.getContext = async () => {
    if (configuration === null) {
        throw new Error('Not Configured');
    }

    if (configuration.connection_pool) {
        if (redisPool === null) {
            redisPool = genericPool.createPool({
                create: () => PromisifyAll(redis.createClient({
                    url: process.env[configuration.connection_string_key]
                })),
                destroy: client => client.quit()
            }, configuration.connection_pool);
        }

        return redisPool;
    }

    if (redisClient) {
        return redisClient;
    }

    redisClient = PromisifyAll(redis.createClient({
        url: process.env[configuration.connection_string_key]
    }));

    return redisClient;
};

exports.getInstance = () => exports.getContext();

exports.closeContext = async () => {
    if (configuration.connection_pool && redisPool !== null) {
        const result = await redisPool.drain();
        await redisPool.clear();
        redisPool = null;
        return result;
    }

    if (redisClient) {
        const result = await redisClient.quit();
        redisClient = null;
        return result;
    }

    return null;
};

module.exports = exports;
