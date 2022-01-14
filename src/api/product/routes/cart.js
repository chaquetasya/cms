module.exports = {
    routes: [
        {
            method: "POST",
            path: "/cart/totalize",
            handler: "cart.calculateTotal",
            config: {
                auth: false,
            },
        },

        {
            method: "POST",
            path: "/cart",
            handler: "cart.createOrder",
            config: {
                auth: false,
            },
        },
    ],
};
