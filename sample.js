'use strict';

const lambda = require('./');

lambda.handler({
    action: 'redisWithPool',
    body: {
        event_id: '9a804235-f0ce-4253-945f-2bfc91f54dea',
        full_name: 'Jason Wihardja',
        email: 'jason@julo.co.id'
    }
}, {}).then(result => {
    console.log(JSON.stringify(result, null, 4));
    console.log('DONE');
}).catch(err => {
    console.error(err.stack);
});
