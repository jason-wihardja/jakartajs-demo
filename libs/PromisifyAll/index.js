'use strict';

const util = require('util');

const skippedFunctions = Object.getOwnPropertyNames(Object.prototype)
    .reduce((map, functionName) => {
        map[functionName] = true;
        return map;
    }, {});

function promisifyAllFunctions(object) {
    for (const key of Object.getOwnPropertyNames(object)) {
        if (skippedFunctions[key]) {
            continue;
        }

        const descriptors = Object.getOwnPropertyDescriptor(object, key);

        if (!descriptors.get) {
            const func = object[key];
            if (typeof func === 'function') {
                object[`${key}Async`] = util.promisify(func);
            }
        }
    }
}

module.exports = (object) => {
    promisifyAllFunctions(object);

    const prototypes = Object.getPrototypeOf(object);
    if (prototypes) {
        promisifyAllFunctions(prototypes);
    }

    return object;
};
