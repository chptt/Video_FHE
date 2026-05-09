/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: ["node_modules/**", ".next/**", "artifacts/**", "cache/**"],
  },
];

export default config;
