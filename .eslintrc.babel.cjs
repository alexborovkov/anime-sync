// Separate Babel config for ESLint - without async template plugin
module.exports = {
  plugins: [
    [
      '@babel/plugin-proposal-decorators',
      {
        version: '2023-05',
      },
    ],
  ],
};
