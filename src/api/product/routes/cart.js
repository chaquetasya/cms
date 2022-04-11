module.exports = {
    routes: [
        {
            method: "POST",
            path: "/cart/totalize",
            handler: "cart.handleCalculateTotal",
            config: {
                auth: false,
            },
        },

        {
            method: "POST",
            path: "/cart",
            handler: "cart.handleCreateOrder",
            config: {
                auth: false,
            },
        },
    ],
};
