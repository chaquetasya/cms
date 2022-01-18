"use strict";

/**
 *  header controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::header.header", () => {
    return {
        async find(ctx) {
            const res = await strapi.entityService.findMany(
                "api::header.header",
                {
                    populate: "links, logo",
                }
            );

            ctx.body = res;
        },
    };
});
