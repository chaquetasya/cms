module.exports = {
    routes: [
        {
            method: "GET",
            path: "/stock",
            handler: "stock.listByDesign",
            config: {
                auth: false,
            },
        },
    ],
};
