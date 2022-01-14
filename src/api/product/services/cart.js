"use strict";

const axios = require("axios");

/**
 * cart service.
 */

module.exports = {
    /**
     *
     * @param {{
     *  designID: string | number,
     *  products: Array<{
     *      sku: string;
     *      quantity: number;
     *  }>,
     * }} item Cart item
     */
    async createResumeByItem(item) {
        // DESIGN

        const design = await strapi.entityService.findOne(
            "api::design.design",
            item.designID
        );

        if (!design) {
            return {
                message: "DESIGN_NOT_FOUND",
                error: true,
            };
        }

        // PRODUCTS

        const skus = item.products.map(product => product.sku);

        const products = await strapi.entityService.findMany(
            "api::product.product",
            {
                populate: "*",
                filters: {
                    design: item.designID,
                    sku: {
                        $in: skus,
                    },
                },
            }
        );

        if (products.length !== item.products.length) {
            return {
                message: "PRODUCTS_NOT_FOUND",
                error: true,
            };
        }

        // PRICES

        const prices = products.map(product => {
            const selected = item.products.find(i => i.sku === product.sku);

            const price = product.prices.find(price => {
                const min = selected.quantity >= price.min;
                const max = price.max ? selected.quantity <= price.max : true;

                return min && max && price.currency === "COP";
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
                quantity: selected.quantity,
                currency: price.currency,
                stock: product.stock,
                price: price.value,
                subtotal: subtotal,
                total: subtotal,
            };
        });

        const subtotal = prices.reduce((acc, item) => acc + item.subtotal, 0);

        return {
            designID: design.id,
            currency: "COP",
            products: prices,
            subtotal: subtotal,
        };
    },

    /**
     *
     * @typedef Shipping
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
     * @typedef CartItem
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
     *  quantity: number,
     *  price: number,
     *  subtotal: number,
     *  total: number,
     * }>} products
     */

    /**
     *
     *
     * @param {{
     *  currency: "COP",
     *  shipping: Shipping,
     *  preference: Preference,
     *  cart: Array<CartItem>,
     * }} data Order data to record
     * */
    async createOrder(data) {
        const cart = data.cart.map(item => {
            let total = 0;

            item.products = item.products.map(product => {
                const copy = { ...product };

                delete copy.id;

                total += product.total;

                return {
                    ...copy,
                    product: product.id,
                };
            });

            return {
                ...item,
                total: total,
            };
        });

        const total = cart.reduce((acc, it) => acc + it.total, 0);

        const order = await strapi.entityService.create("api::order.order", {
            data: {
                collector: data.preference.collector,
                preference: data.preference.id,
                paymentURL: data.preference.initURL,
                shipping: data.shipping,
                currency: data.currency,
                total: total,
                metadata: {},
                status: "PENDING",
                cart: cart,
            },
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
     * @param {{
     *  currency: "COP",
     *  collector: "MERCADOPAGO",
     *  cart: Array<CartItem>,
     *  shipping: Shipping,
     * }} data
     *
     * @returns {Preference}
     */
    async createPreference(data) {
        const products = data.cart
            .map(i => i.products)
            .flat()
            .map(product => {
                return {
                    id: product.id,
                    title: product.title,
                    quantity: product.quantity,
                    currency_id: data.currency,
                    unit_price: product.price,
                };
            });

        const payer = {
            name: data.shipping.firstname,
            surname: data.shipping.lastname,
            email: data.shipping.email,
        };

        const back_urls = {
            success: "http://localhost:3000/success",
            pending: "http://localhost:3000/pending",
            failure: "http://localhost:3000/failure",
        };

        const response = await axios({
            method: "POST",
            url: "https://api.mercadopago.com/checkout/preferences",
            headers: {
                Authorization:
                    "Bearer TEST-6079595518141925-011300-4e57bb49a14ae0cb160b6fe4bd3f03dd-540002972",
            },
            data: {
                items: products,
                payer: payer,
                back_urls: back_urls,
            },
        });

        if (response.data.id) {
            return {
                id: response.data.id,
                collector: data.collector,
                initURL: response.data.init_point,
            };
        }
    },
};
