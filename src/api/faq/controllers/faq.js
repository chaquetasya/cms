"use strict";

/**
 *  faq controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::faq.faq", () => {
    return {
        async find(ctx) {
            const faqs = await strapi.query("api::faq.faq").findOne({
                populate: {
                    questions: true,
                },
            });

            ctx.status = 200;
            ctx.body = faqs;
        },
    };
});
