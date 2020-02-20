'use strict';

module.exports = (configuration) => {
    const result = {
        dialect: 'mysql'
    };

    if (configuration.pool) {
        result.pool = configuration.pool;
    }

    if (configuration.logger) {
        result.logging = configuration.logger;
    }

    result.operatorsAliases = false;

    return result;
}
