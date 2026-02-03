// app.config.js
module.exports = ({ config }) => {
  if (process.env.WEB_BUILD === '1') {
    return {
      ...config,
      experiments: {
        ...config.experiments,
        baseUrl: '/mygmailexpo',
      },
    };
  }
  return config;
};
