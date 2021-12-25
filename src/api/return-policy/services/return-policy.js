'use strict';

/**
 * return-policy service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::return-policy.return-policy');
