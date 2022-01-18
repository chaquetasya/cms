"use strict";

/**
 *  design controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::design.design", () => {
    return {
        async find(ctx) {
            const res = await strapi.entityService.findMany(
                "api::design.design",
                {
                    populate: "forwards, backwards, products",
                }
            );

            ctx.body = res;
        },
    };
});
