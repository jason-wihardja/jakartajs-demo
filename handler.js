'use strict';

const _ = require('lodash');
const Joi = require('@hapi/joi');

const DBContext = require('./db_context');
const MongoContext = require('./mongo_context');
const RedisContext = require('./redis_context');

const AppError = require('./error');

exports.getEvents = async (event, context) => {
    const models = await DBContext.getInstance();

    return models.Events.findAll({
        include: [{
            model: models.Participants,
            required: true
        }]
    });
};

exports.createEvent = async (event, context) => {
    let input = null;

    try {
        input = await Joi.object().keys({
            name: Joi.string().required()
        }).validateAsync(event.body);
    } catch (err) {
        throw AppError.BadRequest(err.message);
    }

    try {
        const models = await DBContext.getInstance();
        const t = await DBContext.startTransaction(context);

        const existing = await models.Events.count({
            where: {
                name: input.name
            },
            transaction: t
        });

        if (existing > 0) {
            throw AppError.UnprocessableEntity('Event Already Exists');
        }

        const event = await models.Events.create({
            name: input.name
        }, {
            transaction: t
        });

        await DBContext.commit(context);

        return event;
    } catch (err) {
        await DBContext.rollback(context);
        throw err;
    }
};

exports.editEvent = async (event, context) => {
    let input = null;

    try {
        input = await Joi.object().keys({
            event_id: Joi.string().trim().guid({
                version: [
                    'uuidv4'
                ]
            }).required(),
            name: Joi.string().required()
        }).validateAsync(event.body);
    } catch (err) {
        throw AppError.BadRequest(err.message);
    }

    try {
        const models = await DBContext.getInstance();
        const t = await DBContext.startTransaction(context);

        const event = await models.Events.findOne({
            where: {
                uuid: input.event_id
            },
            transaction: t
        });

        if (!event) {
            throw AppError.UnprocessableEntity('Event Not Exists');
        }

        event.set('name', input.name);
        await event.save({
            transaction: t
        });

        await DBContext.commit(context);

        return event;
    } catch (err) {
        await DBContext.rollback(context);
        throw err;
    }
};

exports.addParticipant = async (event, context) => {
    let input = null;

    try {
        input = await Joi.object().keys({
            event_id: Joi.string().trim().guid({
                version: [
                    'uuidv4'
                ]
            }).required(),
            full_name: Joi.string().trim().required(),
            email: Joi.string().trim().email().required()
        }).validateAsync(event.body);
    } catch (err) {
        throw AppError.BadRequest(err.message);
    }

    try {
        const models = await DBContext.getInstance();
        const t = await DBContext.startTransaction(context);

        const event = await models.Events.findOne({
            where: {
                uuid: input.event_id
            },
            include: [{
                model: models.Participants,
                required: false
            }],
            transaction: t
        });

        if (!event) {
            throw AppError.UnprocessableEntity('Event Does Not Exist');
        }

        const duplicate = _.find(event.Participants, el => el.email === input.email);
        if (duplicate) {
            throw AppError.UnprocessableEntity('Participants with This Email Already Registered');
        }

        const participant = await models.Participants.create({
            event_id: event.id,
            full_name: input.full_name,
            email: input.email
        }, {
            transaction: t
        });

        await DBContext.commit(context);

        return participant;
    } catch (err) {
        await DBContext.rollback(context);
        throw err;
    }
};

exports.removeParticipant = async (event, context) => {
    let input = null;

    try {
        input = await Joi.object().keys({
            event_id: Joi.string().trim().guid({
                version: [
                    'uuidv4'
                ]
            }).required(),
            email: Joi.string().trim().email().required()
        }).validateAsync(event.body);
    } catch (err) {
        throw AppError.BadRequest(err.message);
    }

    try {
        const models = await DBContext.getInstance();
        const t = await DBContext.startTransaction(context);

        const event = await models.Events.findOne({
            where: {
                uuid: input.event_id
            },
            include: [{
                model: models.Participants,
                where: {
                    email: input.email
                },
                required: false
            }],
            transaction: t
        });

        if (!event) {
            throw AppError.UnprocessableEntity('Event Does Not Exist');
        }

        if (event.Participants.length === 0) {
            throw AppError.UnprocessableEntity('Participant Not Registered for This Event');
        }

        const participant = event.Participants[0].getValues();

        await event.Participants[0].destroy({
            transaction: t
        });

        await DBContext.commit(context);

        return participant;
    } catch (err) {
        await DBContext.rollback(context);
        throw err;
    }
};

exports.redisWithoutPool = async (event, context) => {
    const redisClient = await RedisContext.getInstance();

    const numbers = [...Array(100).keys()].map(el => (el + 1) + '');
    await Promise.all(numbers.map(async (number) => {
        const result = await redisClient.setAsync(number, number + '');
        console.log(`${number} Done`);
        return result;
    }));
    // console.log(`${numbers.length} Done`);

    return {
        message: 'OK'
    };
};

exports.redisWithPool = async (event, context) => {
    const redisPool = await RedisContext.getInstance();

    const numbers = [...Array(100).keys()].map(el => (el + 1) + '');
    await Promise.all(numbers.map(number => redisPool.use(async (redisClient) => {
        const result = await redisClient.setAsync(number, number + '');
        console.log(`${number} Done`);
        return result;
    })));
    // console.log(`${numbers.length} Done`);

    return {
        message: 'OK'
    };
};

exports.sampleMongo = async (event, context) => {
    const mongoClient = await MongoContext.getInstance();
    return await mongoClient.collection('sample').updateOne({
        key: 'jakartajs-demo'
    }, {
        $set: {
            value: event.body
        }
    }, {
        upsert: true
    });
};

module.exports = exports;
