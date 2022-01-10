"use strict";

/**
 * A set of functions called "actions" for `cart`
 */

/**
 *
 * @param {{
 *  designID: string,
 *  print: any,
 *  products: Array<{ sku: string; quantity: number; }>
 * }} item Cart item
 */
async function createResumeByItem(item) {
    const skus = item.products.map(product => product.sku);

    const products = await strapi.entityService.findMany(
        "api::product.product",
        {
            populate: "prices",
            filters: {
                sku: {
                    $in: skus,
                },
            },
        }
    );

    if (products.length !== item.products.length) {
        throw new Error("Product not found");
    }

    const prices = products.map(product => {
        const selected = item.products.find(i => i.sku === product.sku);

        const price = product.prices.find(price => {
            const min = selected.quantity >= price.min;
            const max = price.max ? selected.quantity <= price.max : true;

            return min && max && price.currency === "COP";
        });

        const subtotal = price ? selected.quantity * price.value : null;

        return {
            sku: product.sku,
            quantity: selected.quantity,
            stock: product.stock,
            subtotal: subtotal,
        };
    });

    const total = prices.reduce((acc, item) => acc + item.subtotal, 0);

    return {
        currency: "COP",
        total: total,
        products: prices,
    };
}

module.exports = {
    // exampleAction: async (ctx, next) => {
    //   try {
    //     ctx.body = 'ok';
    //   } catch (err) {
    //     ctx.body = err;
    //   }
    // }

    calculateTotal: async (ctx, next) => {
        try {
            const list = [];
            const items = ctx.request.body;

            if (Array.isArray(items)) {
                for (const item of items) {
                    const value = await createResumeByItem(item);
                    list.push(value);
                }
            }

            ctx.body = list;
        } catch (err) {
            console.error(err);
            ctx.body = err;
        }
    },
};
