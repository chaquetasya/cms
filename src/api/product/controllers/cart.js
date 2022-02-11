"use strict";

const Joi = require("joi");

const currencySchema = Joi.string().valid("COP", "USD");

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
            const body = ctx.request.body;

            const schema = Joi.object({
                currency: currencySchema.required(),
                items: Joi.array().items(
                    Joi.object({
                        id: Joi.string().required(),
                        designID: Joi.number().required(),
                        products: productsSchema,
                        prints: Joi.object({
                            upperLeft: Joi.string(),
                            upperRight: Joi.string(),
                            upperBack: Joi.string(),
                        }),
                    })
                ),
            });

            const schemaErrors = schema.validate(body).error;

            if (!schemaErrors) {
                const service = strapi.service("api::product.cart");
                const items = [];

                let subtotal = 0;

                for (const item of body.items) {
                    const resume = await service.createResumeByItem({
                        ...item,
                        currency: body.currency,
                    });

                    if (resume.error === true) {
                        items.push({
                            ...resume,
                            id: item.id,
                        });

                        continue;
                    }

                    subtotal += resume.total;

                    items.push({
                        ...resume,
                        id: item.id,
                        prints: item.prints,
                    });
                }

                const shipping = service.calculateShipping({
                    currency: body.currency,
                    subtotal: subtotal,
                });

                ctx.body = {
                    currency: body.currency,
                    items: items,
                    shipping: shipping,
                    subtotal: subtotal,
                    total: subtotal + shipping,
                };

                return;
            }

            ctx.status = 400;
            ctx.body = {
                message: "INVALID_REQUEST",
                payload: schemaErrors,
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
                currency: currencySchema.required(),

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

            if (!schemaErrors) {
                const service = strapi.service("api::product.cart");
                const cart = [];

                for (const item of body.cart) {
                    const resume = await service.createResumeByItem({
                        currency: body.currency,
                        ...item,
                    });

                    if (!resume.total || isNaN(resume.total)) {
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

                // CREATE ORDER

                const doc = await service.createOrder(order);

                // PAYMENT

                const preference = await service.createPreference({
                    ...order,
                    id: doc.id,
                });

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
                        preferenceID: preference.id,
                        collector: doc.collector,
                        paymentURL: preference.initURL,
                        total: doc.total,
                    },
                };

                return;
            }

            ctx.status = 400;
            ctx.body = {
                message: "INVALID_REQUEST",
                payload: schemaErrors,
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
