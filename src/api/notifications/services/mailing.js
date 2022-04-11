"use strict";

const { addBreadcrumb, captureException } = require("@sentry/node");

const axios = require("axios");
const _ = require("lodash");

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
     *  templateID: string,
     *  templateData: {
     *      [key: string]: string
     *  }
     * }} data Mailing data
     */
    async sendTemplateEmail(data) {
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

                    templateId: Number(data.templateID),
                    params: data.templateData,
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
     *  to: string,
     *
     *  order: {
     *      id: string,
     *  },
     *
     *  user: {
     *      firstname: string,
     *      lastname: string,
     *      email: string
     *  },
     * }} data
     */
    async sendOrderCreated(data) {
        const templateID = process.env.SENDINBLUE_EMAIL_ORDER_CREATED_ID;
        const webURL = process.env.APP_URL;

        addBreadcrumb({
            message: "Sending order created email",
            category: "mailing",
            level: "info",
            data: {
                id: data.order.id,
                to: data.user.email,
            },
        });

        const firstname = _.capitalize(data.user.firstname?.trim());
        const lastname = data.user.lastname?.trim();
        const orderURL = `${webURL}/orden/${data.order.id}`;

        this.sendTemplateEmail({
            to: data.to,
            subject: "Sobre tu orden",
            templateID: templateID,
            templateData: {
                firstname,
                lastname,
                orderURL,
            },
        });
    },

    /**
     *
     * @param {{
     *  to: string,
     *
     *  order: {
     *      id: string,
     *  },
     *
     *  user: {
     *      firstname: string,
     *      lastname: string,
     *      email: string
     *  },
     * }} data
     */
    async sendOrderConfirmed(data) {
        const templateID = process.env.SENDINBLUE_EMAIL_ORDER_CONFIRMED_ID;
        const webURL = process.env.APP_URL;

        addBreadcrumb({
            message: "Sending order confirmed email",
            category: "mailing",
            level: "info",
            data: {
                id: data.order.id,
                to: data.user.email,
            },
        });

        const firstname = _.capitalize(data.user.firstname?.trim());
        const lastname = data.user.lastname?.trim();
        const orderURL = `${webURL}/orden/${data.order.id}`;

        this.sendTemplateEmail({
            to: data.email,
            subject: "Sobre tu orden",
            templateID: templateID,
            templateData: {
                firstname,
                lastname,
                orderURL,
            },
        });
    },
};
