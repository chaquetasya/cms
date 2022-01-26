"use strict";

module.exports = {
    mercadoPago: async (ctx, next) => {
        try {
            const body = ctx.request.body;

            // PAYMENT

            if (body.type === "payment" && body.data?.id) {
                const service = strapi.service("api::webhook.mercadopago");
                const payment = await service.findPayment(body.data.id);

                if (payment && payment.status === "approved") {
                    const order = await strapi.entityService.findOne(
                        "api::order.order",
                        payment.external_reference
                    );

                    if (!order) {
                        ctx.status = 404;
                        ctx.body = {
                            message: "ORDER_NOT_FOUND",
                            error: true,
                        };

                        return;
                    }

                    await strapi.entityService.update(
                        "api::order.order",
                        payment.external_reference,
                        {
                            data: {
                                status: "CONFIRMED",
                                payment: {
                                    collector: "MERCADOPAGO",
                                    currency: payment.currency_id,
                                    amount: payment.transaction_amount,
                                    external: body.data.id,
                                    preference: payment.order.id,
                                    paidAt: payment.date_created,
                                    metadata: payment,
                                },
                            },
                        }
                    );

                    ctx.status = 202;
                    ctx.body = {
                        message: "PAYMENT_APPROVED",
                        error: false,
                    };

                    return;
                }

                ctx.status = 400;
                ctx.body = {
                    message: "INVALID_REQUEST",
                    error: true,
                };
            }
        } catch (err) {
            ctx.status = 500;
            ctx.body = {
                message: err.message,
                payload: err,
                error: true,
            };
        }
    },
};
