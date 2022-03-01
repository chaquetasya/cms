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
                        populate: {
                            design: {
                                populate: {
                                    forwards: true,
                                    backwards: true,
                                },
                            },
                            products: {
                                populate: {
                                    product: true,
                                },
                            },
                            prints: {
                                populate: true,
                            },
                        },
                    },

                    shipment: true,
                    messenger: true,
                    payment: true,
                    invoice: true,
                    messenger: true,
                },

                where: {
                    id,
                },
            });

            if (!order) {
                ctx.status = 404;
                return;
            }

            order.cart = order.cart.map(item => {
                item.products = item.products.map(p => {
                    const newProduct = {
                        sku: p.product.sku,
                        quantity: p.quantity,
                        currency: p.currency,
                        title: p.product.title,
                        size: p.product.size,
                        price: p.price,
                        subtotal: p.subtotal,
                        total: p.total,
                    };

                    return newProduct;
                });

                return item;
            });

            ctx.body = order;
            return;
        },
    };
});
