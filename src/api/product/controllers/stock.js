"use strict";

/**
 * A set of functions called "actions" for `stock`
 */

module.exports = {
    // exampleAction: async (ctx, next) => {
    //   try {
    //     ctx.body = 'ok';
    //   } catch (err) {
    //     ctx.body = err;
    //   }
    // }

    listByDesign: async (ctx, next) => {
        try {
            const products = await strapi.entityService.findMany(
                "api::product.product",
                {
                    populate: "prices",
                    filters: {
                        design: ctx.query.designID || false,
                    },
                }
            );

            ctx.body = products || [];
        } catch (err) {
            console.error(err);
            ctx.body = [];
        }
    },
};
