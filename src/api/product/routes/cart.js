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
    ],
};
