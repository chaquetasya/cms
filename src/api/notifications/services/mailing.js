"use strict";

const mailjet = require("node-mailjet");

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
            const mailer = mailjet.connect(
                process.env.MAILJET_API_KEY,
                process.env.MAILJET_API_SECRET
            );

            await mailer.post("send", { version: "v3.1" }).request({
                Messages: [
                    {
                        From: {
                            Email: process.env.MAILJET_EMAIL,
                            Name: "Chaquetas Ya",
                        },
                        To: [
                            {
                                Email: data.to,
                            },
                        ],
                        Subject: data.subject,
                        HTMLPart: data.html,
                    },
                ],
            });
        } catch (err) {
            console.error(err);
        }
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
