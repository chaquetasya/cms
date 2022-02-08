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

                where: {
                    locale: ctx.request?.query?.locale ?? "en",
                },
            });

            if (Array.isArray(faqs?.questions)) {
                return faqs?.questions;
            }

            ctx.status = 404;
            return;
        },
    };
});
