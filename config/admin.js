module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'f96652e0c4c857b8d24bc0aaa7d070d5'),
  },
});
