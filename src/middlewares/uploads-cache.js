"use strict";

/**
 * `global::uploads-cache` middleware.
 */

module.exports = (config, { strapi }) => {
    return async (ctx, next) => {
        const regex = /^\/uploads\/.+\.(webp|png|jpe?g|gif|pdf)/;

        if (ctx.method === "GET" && ctx.url.match(regex)) {
            strapi.log.info("Setting cache headers for uploads");
            ctx.set("Cache-Control", "must-revalidate, public, max-age=86400");
        }

        await next();
    };
};
