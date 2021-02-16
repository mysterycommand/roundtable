/**
 * n.b. The added "@type" comment will enable TypeScript type information via
 * VSCode, etc.
 *
 * @see https://www.snowpack.dev/reference/configuration
 */

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    src: '/',
    public: '/',
  },
  plugins: ['@snowpack/plugin-typescript'],
  packageOptions: {},
  devOptions: {
    open: 'none',
    output: 'stream',
    port: 8000,
  },
  buildOptions: {
    out: 'dist',
  },
};
