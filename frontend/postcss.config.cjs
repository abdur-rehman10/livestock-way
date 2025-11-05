// postcss.config.cjs
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},  // new Tailwind PostCSS plugin
    autoprefixer: {},            // still needed for vendor prefixes
  },
};
