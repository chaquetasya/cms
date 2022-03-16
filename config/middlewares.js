module.exports = [
    "strapi::errors",
    "strapi::security",
    "strapi::cors",
    "strapi::logger",
    "strapi::query",
    "strapi::favicon",
    "strapi::public",

    {
        name: "strapi::body",
        config: {
            formLimit: "10MB",
            jsonLimit: "10MB",
            textLimit: "10MB",
            formidable: {
                maxFileSize: 8 * 1024 * 1024,
            },
        },
    },
];
