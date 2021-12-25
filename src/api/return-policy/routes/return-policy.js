'use strict';

/**
 * return-policy router.
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::return-policy.return-policy');
