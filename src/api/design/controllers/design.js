"use strict";

/**
 *  design controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::design.design", () => {
    return {
        async find(ctx) {
            const currency = ctx.query.currency ?? "COP";

            const res = await strapi.query("api::design.design").findMany({
                populate: {
                    forwards: true,
                    backwards: true,
                    prices: {
                        where: {
                            currency: currency,
                        },
                    },
                },

                where: {
                    prices: {
                        currency: currency,
                    },
                },
            });

            if (Array.isArray(res)) {
                const designs = res.map(design => {
                    return {
                        ...design,
                        prices: design.prices[0],
                    };
                });

                ctx.body = designs;
                return;
            }

            ctx.status = 400;
            ctx.body = [];
        },
    };
});
