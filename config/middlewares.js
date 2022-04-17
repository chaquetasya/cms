module.exports = [
    "strapi::errors",
    "strapi::security",
    "strapi::logger",
    "strapi::query",
    "strapi::favicon",
    "global::uploads-cache",
    "strapi::public",
    "strapi::cors",

    {
        name: "strapi::body",
        config: {
            formLimit: "10MB",
            jsonLimit: "10MB",
            textLimit: "10MB",
            formidable: {
                maxFileSize: 1024 * 1024 * 10, // 10MB
            },
        },
    },
];
