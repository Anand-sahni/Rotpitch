/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Type-check & lint the shared workspace package alongside the app.
  transpilePackages: ['@rotpitch/shared'],
  webpack: (config) => {
    // packages/shared uses NodeNext-style explicit `.js` import specifiers
    // (e.g. `export * from './plans.js'`) that resolve to `.ts` on disk.
    // Teach webpack to try `.ts`/`.tsx` for a `.js` request so the workspace
    // package bundles without rewriting its source extensions.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
