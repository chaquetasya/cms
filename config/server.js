module.exports = ({ env }) => ({
    host: env("HOST", "localhost"),
    port: env.int("PORT", 1337),
    url: env("URL", "http://localhost:1337"),
});
