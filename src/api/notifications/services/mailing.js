"use strict";

const { addBreadcrumb, captureException } = require("@sentry/node");
const axios = require("axios");

// @ts-check

/**
 * mailing service.
 */

module.exports = {
    /**
     *
     * @param {{
     *  to: string,
     *  subject: string,
     *  html: string
     * }} data Mailing data
     */
    async sendBasicEmail(data) {
        try {
            const res = await axios({
                method: "POST",
                url: "https://api.sendinblue.com/v3/smtp/email",
                headers: {
                    "api-key": process.env.SENDINBLUE_TOKEN,
                },
                data: {
                    subject: data.subject,
                    to: [{ email: data.to }],
                    sender: {
                        name: "Chaquetas Ya",
                        email: process.env.SENDINBLUE_EMAIL,
                    },

                    htmlContent: data.html,
                },
            });

            if (res.status === 200) {
                return true;
            }
        } catch (err) {
            console.error(err);
            captureException(err);
        }

        return false;
    },

    /**
     *
     * @param {{
     *  id: string,
     *  firstname: string,
     *  email: string,
     * }} data
     */
    async sendOrderCreated(data) {
        const webURL = process.env.APP_URL;

        addBreadcrumb({
            message: "Sending order created email",
            category: "mailing",
            level: "info",
            data: {
                id: data.id,
                firstname: data.firstname,
                email: data.email,
            },
        });

        this.sendBasicEmail({
            to: data.email,
            subject: "Tu orden ha sido creada",
            html: `
                <h1>¡Hola, ${data.firstname}!</h1>
                <p>
                    Tu orden ha sido creada correctamente y puedes darle seguimiento a tu orden en <a href="${webURL}/orden/${data.id}">nuestra plataforma</a>.
                </p>
                <br />
                <b>Chaquetas Ya</b>
            `,
        });
    },

    /**
     *
     * @param {{
     *  id: string,
     *  firstname: string,
     *  email: string,
     * }} data
     */
    async sendOrderConfirmed(data) {
        const webURL = process.env.APP_URL;

        addBreadcrumb({
            message: "Sending order confirmed email",
            category: "mailing",
            level: "info",
            data: {
                id: data.id,
                firstname: data.firstname,
                email: data.email,
            },
        });

        this.sendBasicEmail({
            to: data.email,
            subject: "Tu orden ha sido confirmada",
            html: `
                <h1>¡Hola, ${data.firstname}!</h1>
                <p>
                    El pago de tu orden ha sido confirmada, puedes darle seguimiento a tu orden en <a href="${webURL}/orden/${data.id}">nuestra plataforma</a>.
                </p>
                <br />
                <b>Chaquetas Ya</b>
            `,
        });
    },
};
