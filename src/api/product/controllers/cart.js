"use strict";

const Joi = require("joi");

const productsSchema = Joi.array()
    .min(1)
    .items(
        Joi.object({
            sku: Joi.string().required(),
            quantity: Joi.number().min(1).required(),
        })
    );

module.exports = {
    calculateTotal: async (ctx, next) => {
        try {
            const items = ctx.request.body;

            const schema = Joi.array()
                .min(1)
                .items(
                    Joi.object({
                        designID: Joi.number().required(),
                        products: productsSchema,
                    })
                );

            const schemaErrors = schema.validate(items).error;

            if (!schemaErrors) {
                const createResumeByItem =
                    strapi.service("api::product.cart").createResumeByItem;

                const responses = await Promise.all(
                    items.map(createResumeByItem)
                );

                ctx.body = responses;
                return;
            }

            ctx.status = 400;
            ctx.body = {
                message: "INVALID_REQUEST",
                error: true,
            };
        } catch (err) {
            console.error(err);
            ctx.body = err;
        }
    },

    createOrder: async (ctx, next) => {
        try {
            const body = ctx.request.body;

            const schema = Joi.object({
                shipping: Joi.object({
                    firstname: Joi.string().required(),
                    lastname: Joi.string().required(),
                    email: Joi.string().email().required(),
                    phone: Joi.string(),
                    country: Joi.string().required(),
                    city: Joi.string().required(),
                    address: Joi.string().required(),
                    zip: Joi.string().allow(""),
                    note: Joi.string().allow(""),
                }),

                cart: Joi.array()
                    .min(1)
                    .items(
                        Joi.object({
                            designID: Joi.number().required(),

                            prints: {
                                upperLeftID: Joi.number(),
                                upperRightID: Joi.number(),
                                upperBackID: Joi.number(),
                            },

                            products: productsSchema,
                        })
                    ),
            });

            const schemaErrors = schema.validate(body).error;

            console.log(schemaErrors);

            if (!schemaErrors) {
                const service = strapi.service("api::product.cart");
                const cart = [];

                for (const item of body.cart) {
                    const resume = await service.createResumeByItem(item);

                    if (!resume.subtotal || isNaN(resume.subtotal)) {
                        throw Error("INVALID_RESUME");
                    }

                    cart.push({
                        design: resume.designID,
                        prints: item.prints,
                        products: resume.products,
                    });
                }

                const order = {
                    currency: "COP",
                    collector: "MERCADOPAGO",
                    shipping: body.shipping,
                    cart: cart,
                };

                // PAYMENT

                order.preference = await service.createPreference(order);

                // CREATE ORDER

                const doc = await service.createOrder(order);

                if (!doc) {
                    ctx.body = {
                        message: "ORDER_NOT_CREATED",
                        error: true,
                    };

                    return;
                }

                ctx.body = {
                    message: "ORDER_CREATED",
                    payload: {
                        orderID: doc.id,
                        preferenceID: doc.preference,
                        paymentURL: doc.paymentURL,
                    },
                };

                return;
            }

            ctx.status = 400;
            ctx.body = {
                message: "INVALID_REQUEST",
                error: true,
            };
        } catch (err) {
            console.error(err);

            ctx.body = {
                message: err.message,
                error: true,
            };
        }
    },
};
