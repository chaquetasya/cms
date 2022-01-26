"use strict";

const axios = require("axios");

module.exports = {
    async findPayment(id) {
        const paymentRequest = await axios({
            method: "GET",
            url: `https://api.mercadopago.com/v1/payments/${id}`,
            headers: {
                Authorization: `Bearer ${process.env.MERCADOPAGO_TOKEN}`,
            },
        });

        if (paymentRequest.status === 200) {
            return paymentRequest.data;
        }

        return null;
    },
};
