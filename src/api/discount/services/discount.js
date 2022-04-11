const _ = require("lodash");

/**
 *
 * @typedef Discount
 * @prop {string} title
 * @prop {"SUBTOTAL"} to
 * @prop {"COP"} currency
 * @prop {number} percentage
 */

/**
 *
 * @param {{
 *  currency: "COP",
 *  subtotal: number,
 *  quantities: number,
 * }} data
 * @returns {Promise<Discount>} Appliable discount
 */
async function findDiscountByResume(data) {
    const results = await strapi.query("api::discount.discount").findMany({
        where: {
            currency: data.currency,
        },

        populate: {
            rules: "*",
        },
    });

    const variables = {
        SUBTOTAL: data.subtotal,
        QUANTITIES: data.quantities,
    };

    if (!Array.isArray(results)) return null;

    return _.chain(results)
        .filter(discount => {
            if (!Array.isArray(discount.rules)) return false;

            return discount.rules.every(rule => {
                const variable = variables[rule.variable];

                switch (rule.operator) {
                    case "==":
                        return variable === rule.value;
                    case "!=":
                        return variable !== rule.value;
                    case ">":
                        return variable > rule.value;
                    case "<":
                        return variable < rule.value;
                    case ">=":
                        return variable >= rule.value;
                    case "<=":
                        return variable <= rule.value;
                    default:
                        return false;
                }
            });
        })
        .sort(d => d.percentage)
        .first()
        .omit("rules")
        .value();
}

/**
 * @param {Discount} discount
 * @param {{
 *  currency: "COP",
 *  subtotal: number,
 *  quantities: number,
 * }} data
 * @returns {Promise<number>} Amount of discount
 */
function calculateDiscountAmount(discount, data) {
    if (!discount) return 0;

    switch (discount.to) {
        case "SUBTOTAL":
            return (discount.percentage / 100) * data.subtotal;
        case "SHIPPING":
            return (discount.percentage / 100) * data.shipping;
        default:
            return 0;
    }
}

/**
 *
 * @param {{
 *  currency: "COP",
 *  subtotal: number,
 *  quantities: number,
 * }} data
 * @returns {Promise<number>} Amount of discount
 */
async function findDiscountAmountByResume(data) {
    const discount = await findDiscountByResume(data);
    return calculateDiscountAmount(discount, data);
}

module.exports = {
    findDiscountByResume,
    findDiscountAmountByResume,
    calculateDiscountAmount,
};
