module.exports = ({ env }) => ({
    connection: {
        client: "mysql",
        connection: {
            host: env("DATABASE_HOST", "localhost"),
            port: env.int("DATABASE_PORT", 3306),
            database: env("DATABASE_NAME"),
            user: env("DATABASE_USERNAME"),
            password: env("DATABASE_PASSWORD"),
        },
    },
});
