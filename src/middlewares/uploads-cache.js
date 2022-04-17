"use strict";

/**
 * `global::uploads-cache` middleware.
 */

module.exports = (config, { strapi }) => {
    return async (ctx, next) => {
        if (ctx.method === "GET" && ctx.url.startsWith("/upload")) {
            strapi.log.info("Setting cache headers for uploads");
            ctx.set("Cache-Control", "must-revalidate, public, max-age=86400");
        }

        await next();
    };
};
