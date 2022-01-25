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
        let total = 0;

        const cart = _.map(data.cart, i => {
            let subtotal = 0;

            const products = _.map(i.products, p => {
                const item = {
                    ...p,
                    product: p.id,
                };

                subtotal += item.total;
                delete item.id;

                return item;
            });

            const prints = _.mapKeys(i.prints, (_, key) => key.split("ID")[0]);

            total += subtotal;

            return {
                ...i,
                products,
                prints,
                total: subtotal,
            };
        });

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
