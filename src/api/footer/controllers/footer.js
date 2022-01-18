"use strict";

/**
 *  footer controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::footer.footer", () => {
    return {
        async find(ctx) {
            const res = await strapi.entityService.findMany(
                "api::footer.footer",
                {
                    populate: "contactLinks, navigationLinks, logo",
                }
            );

            ctx.body = res;
        },
    };
});
