module.exports = ({ env }) => {
    return {
        sentry: {
            enabled: env("NODE_ENV") === "production",

            config: {
                dsn: env("SENTRY_DSN"),
                sendMetadata: true,
            },

            beforeBreadcrumb(breadcrumb) {
                if (breadcrumb.category === "console") {
                    return null;
                }

                return breadcrumb;
            },
        },

        "upload-plugin-cache": {
            enabled: true,
            config: {
                maxAge: 86400000,
            },
        },
    };
};
