module.exports = {
    routes: [
        {
            method: "POST",
            path: "/webhook/mercadopago",
            handler: "webhook.mercadoPago",
            config: {
                auth: false,
            },
        },
    ],
};
