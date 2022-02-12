"use strict";

/**
 *  order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", () => {
    return {
        async findOne(ctx) {
            const { id } = ctx.params;

            const order = await strapi.query("api::order.order").findOne({
                populate: {
                    cart: {
                        populate: true,
                    },

                    shipment: true,
                    messenger: true,
                    payment: true,
                    invoice: true,
                },

                where: {
                    id,
                },
            });

            if (!order) {
                ctx.status = 404;
                return;
            }

            ctx.body = order;
            return;
        },
    };
});
