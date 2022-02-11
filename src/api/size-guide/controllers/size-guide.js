"use strict";

/**
 *  size-guide controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::size-guide.size-guide", () => {
    return {
        async find(ctx) {
            const res = await strapi.entityService.findMany(
                "api::size-guide.size-guide",
                {
                    populate: "references",
                }
            );

            ctx.body = res;
        },
    };
});
