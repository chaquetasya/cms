"use strict";

const axios = require("axios");
const _ = require("lodash");

/**
 * cart service.
 */

module.exports = {
    /**
     *
     * @param {Array<{
     *  currency: "COP";
     *  products: Array<{
     *      sku: string;
     *      quantity: number;
     *  }>;
     * }>} data Cart
     */
    async validateStock(data) {
        const items = _.chain(data)
            .flatMap(p => p.products)
            .groupBy(p => p.sku)
            .mapValues(p => _.sumBy(p, i => i.quantity))
            .value();

        const skus = Object.keys(items);

        const products = await strapi.entityService.findMany(
            "api::product.product",
            {
                populate: "*",
                filters: {
                    sku: {
                        $in: skus,
                    },
                },
            }
        );

        if (products.length === skus.length) {
            let hasStock = true;

            for (const product of products) {
                const quantity = items[product.sku];

                if (quantity > product.stock) {
                    hasStock = false;
                    break;
                }
            }

            return hasStock;
        }

        return false;
    },

    /**
     *
     * @param {{
     *  currency: "COP";
     *  subtotal: number;
     * }} data
     */
    calculateShipping(data) {
        if (data.subtotal === 0) return 0;

        if (data.currency === "COP") {
            return 10000; // 10.000 COP
        }

        return null;
    },

    /**
     *
     * @param {{
     *  id: string;
     *  designID: string | number;
     *  currency: "COP";
     *  products: Array<{
     *      sku: string;
     *      quantity: number;
     *  }>;
     * }} data Cart item
     */
    async createResumeByItem(data) {
        // DESIGN

        const design = await strapi.entityService.findOne(
            "api::design.design",
            data.designID,
            {
                populate: "backwards, forwards",
            }
        );

        if (!design) {
            return {
                id: data.id,
                message: "DESIGN_NOT_FOUND",
                error: true,
            };
        }

        // PRODUCTS

        const skus = data.products.map(product => product.sku);

        const products = await strapi.entityService.findMany(
            "api::product.product",
            {
                populate: "*",
                filters: {
                    design: data.designID,
                    sku: {
                        $in: skus,
                    },
                },
            }
        );

        if (products.length !== data.products.length) {
            return {
                message: "PRODUCTS_NOT_FOUND",
                error: true,
            };
        }

        // PRICES

        const offers = products.map(product => {
            const selected = data.products.find(i => i.sku === product.sku);

            const price = product.prices.find(price => {
                const min = selected.quantity >= price.min;
                const max = price.max ? selected.quantity <= price.max : true;

                return min && max && price.currency === data.currency;
            });

            const subtotal = price ? selected.quantity * price.value : null;

            if (selected.quantity > product.stock) {
                return {
                    sku: product.sku,
                    message: "INSUFFICIENT_STOCK",
                    error: true,
                };
            }

            return {
                id: product.id,
                sku: product.sku,
                title: product.title,
                size: product.size,
                quantity: selected.quantity,
                currency: price.currency,
                stock: product.stock,
                price: price.value,
                subtotal: subtotal,
                total: subtotal,
            };
        });

        let total = 0;

        for (const price of offers) {
            total += price.total;
        }

        return {
            id: data.id,
            design: design,
            currency: data.currency,
            products: offers,
            total: total,
        };
    },

    /**
     *
     * @typedef Shipment
     * @type {object}
     * @prop {string} firstname
     * @prop {string} lastname
     * @prop {string} email
     * @prop {string | undefined} phone
     * @prop {string} country
     * @prop {string} city
     * @prop {string} address
     * @prop {string | undefined} zip
     * @prop {string | undefined} note
     */

    /**
     *
     * @typedef Cart
     * @type {object}
     * @prop {string} design
     * @prop {{
     *  upperLeftID?: number,
     *  upperRightID?: number,
     *  upperBackID?: number,
     * }} prints
     * @prop {Array<{
     *  id: string,
     *  sku: string,
     *  title: string,
     *  size: string,
     *  quantity: number,
     *  currency: "COP",
     *  stock: number,
     *  price: number,
     *  total: number,
     * }>} products
     */

    /**
     *
     *
     * @param {{
     *  currency: "COP",
     *  shipment: Shipment,
     *  collector: "MERCADOPAGO",
     *  cart: Array<Cart>,
     * }} data Order data to record
     * */
    async createOrder(data) {
        let subtotal = 0;

        const carts = _.map(data.cart, item => {
            let total = 0;

            const products = _.map(item.products, product => {
                // CartProduct
                const payload = {
                    product: product.id,
                    price: product.price,
                    total: product.total,
                    quantity: product.quantity,
                    metadata: {
                        sku: product.sku,
                        stock: product.stock,
                    },
                };

                total += payload.total;
                return payload;
            });

            const prints = _.mapKeys(
                item.prints,
                (_, key) => key.split("ID")[0]
            );

            subtotal += total;

            return {
                design: item.design,
                prints: prints,
                products: products,
                total: total,
            };
        });

        const shipment = {
            firstname: data.shipment.firstname,
            lastname: data.shipment.lastname,
            email: data.shipment.email,
            phone: data.shipment.phone,
            country: data.shipment.country,
            city: data.shipment.city,
            address: data.shipment.address,
            zip: data.shipment.zip,
            note: data.shipment.note,
        };

        const shipping = this.calculateShipping({
            currency: data.currency,
            subtotal: subtotal,
        });

        const order = await strapi.entityService.create("api::order.order", {
            data: {
                currency: data.currency,
                subtotal: subtotal,
                shipping: shipping,
                total: subtotal + shipping,
                status: "PENDING",
                cart: carts,
                shipment: shipment,
            },
            populate: "*",
        });

        // DISCOUNT STOCK

        await Promise.all(
            _.chain(carts)
                .flatMap(i => i.products)
                .map(p =>
                    strapi.query("api::product.product").update({
                        where: { sku: p.metadata.sku },
                        data: {
                            stock: p.metadata.stock - p.quantity,
                        },
                    })
                )
                .value()
        );

        // SEND EMAIL

        const mailing = strapi.service("api::notifications.mailing");

        await mailing.sendOrderCreated({
            id: order.id,
            firstname: order.shipment?.firstname ?? "",
            email: order.shipment.email,
        });

        return order;
    },

    /**
     * @typedef Preference
     * @prop {string} id
     * @prop {"MERCADOPAGO"} collector
     * @prop {string} initURL
     */

    /**
     * @typedef CreatePreferenceInput
     * @prop {string} id Order ID
     * @prop {"COP"} currency
     * @prop {"MERCADOPAGO"} collector
     * @prop {Array<Cart>} cart
     * @prop {Shipment} shipment
     * @prop {number} shipping
     */

    /**
     * @param {CreatePreferenceInput} data
     *
     * @returns {Promise<Preference>}
     */
    async createPreference(data) {
        const charges = data.cart
            .flatMap(i => i.products)
            .map(product => {
                return {
                    id: product.sku,
                    title: product.title,
                    quantity: product.quantity,
                    currency_id: data.currency,
                    unit_price: product.price,
                };
            });

        charges.push({
            id: "shipping",
            title: "Envío",
            quantity: 1,
            currency_id: data.currency,
            unit_price: data.shipping,
        });

        const payer = {
            name: data.shipment.firstname,
            surname: data.shipment.lastname,
            email: data.shipment.email,
        };

        // WEBHOOK

        const webURL = process.env.APP_URL;

        const backURLs = {
            success: `${webURL}/orden/${data.id}`,
            pending: `${webURL}/orden/${data.id}`,
            failure: `${webURL}/orden/error`,
        };

        // SEND

        const token = process.env.MERCADOPAGO_TOKEN;

        const { data: response } = await axios({
            method: "POST",
            url: "https://api.mercadopago.com/checkout/preferences",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            data: {
                items: charges,
                payer: payer,
                back_urls: backURLs,
                external_reference: data.id,
            },
        });

        if (response.id) {
            await strapi.entityService.update("api::order.order", data.id, {
                data: {
                    paymentURL: response.init_point,
                },
            });

            return {
                id: response.data.id,
                collector: data.collector,
                initURL: response.data.init_point,
            };
        }
    },
};
