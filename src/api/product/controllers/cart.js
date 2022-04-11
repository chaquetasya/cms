// @ts-check

const Joi = require("joi");
const _ = require("lodash");

const {
    createResumeByItem,
    calculateShipping,
    createOrder,
    createPreference,
} = require("../services/cart");

const {
    findDiscountAmountByResume,
} = require("../../discount/services/discount");

const { captureException } = require("@sentry/node");

const currencySchema = Joi.string().valid("COP", "USD");

const productsSchema = Joi.array()
    .min(1)
    .items(
        Joi.object({
            sku: Joi.string().required(),
            quantity: Joi.number().min(1).required(),
        })
    );

async function handleCalculateTotal(ctx) {
    const body = ctx.request.body;

    // VALIDATE SCHEMA

    const schemaResult = Joi.object({
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
    }).validate(body);

    if (schemaResult.error) {
        ctx.status = 400;
        ctx.body = {
            message: "INVALID_REQUEST",
            payload: schemaResult.error,
            error: true,
        };

        return;
    }

    try {
        const items = [];

        let subtotal = 0;

        for (const item of body.items) {
            const resume = await createResumeByItem({
                id: item.id,
                currency: body.currency,
                prints: item.prints,
                designID: item.designID,
                products: item.products,
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

        const shipping = await calculateShipping({
            currency: body.currency,
            subtotal: subtotal,
        });

        const quantities = _.chain(items)
            .flatMap(cart => cart.products)
            .map(product => product.quantity)
            .sum()
            .value();

        const discount = await findDiscountAmountByResume({
            currency: body.currency,
            subtotal: subtotal,
            quantities: quantities,
        });

        ctx.body = {
            currency: body.currency,
            items: items,
            shipping: shipping,
            subtotal: subtotal,
            discount: discount,
            total: subtotal + shipping - discount,
        };

        return;
    } catch (err) {
        captureException(err);
        console.error(err);
        ctx.body = err;
    }
}

async function handleCreateOrder(ctx) {
    const body = ctx.request.body;

    // VALIDATE SCHEMA

    const schemaResult = Joi.object({
        currency: currencySchema.required(),

        shipment: Joi.object({
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
    }).validate(body);

    if (schemaResult.error) {
        ctx.status = 400;
        ctx.body = {
            message: "INVALID_REQUEST",
            payload: schemaResult.error,
            error: true,
        };

        return;
    }

    try {
        /** @type {any} */
        const cart = [];

        for (const item of body.cart) {
            /** @type {any} */
            const prints = _.mapKeys(item.prints, (_, key) =>
                key.replace("ID", "")
            );

            const resume = await createResumeByItem({
                id: item.id,
                currency: body.currency,
                prints: prints,
                designID: item.designID,
                products: item.products,
            });

            if (!resume.total || isNaN(resume.total)) {
                throw Error("INVALID_RESUME");
            }

            cart.push({
                design: item.designID,
                prints: prints,
                products: resume.products,
            });
        }

        // CREATE ORDER

        const doc = await createOrder({
            currency: "COP",
            collector: "MERCADOPAGO",
            shipment: body.shipment,
            cart: cart,
        });

        if (!doc) {
            ctx.body = {
                message: "ORDER_NOT_CREATED",
                error: true,
            };

            return;
        }

        // PAYMENT

        const preference = await createPreference({
            id: doc.id,
            currency: "COP",
            collector: "MERCADOPAGO",
            cart: cart,
            shipment: body.shipment,
            shipping: doc.shipping,
            discounts: doc.discounts,
        });

        if (!preference) {
            ctx.status = 206;
            ctx.body = {
                message: "PREFERENCE_NOT_CREATED",
                error: true,
            };

            return;
        }

        ctx.status = 201;
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
    } catch (err) {
        console.error(err);
        captureException(err);

        ctx.body = {
            message: err.message,
            error: true,
        };
    }
}

module.exports = {
    handleCalculateTotal,
    handleCreateOrder,
};
