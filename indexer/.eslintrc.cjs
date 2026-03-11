module.exports = {
  extends: "ponder",
  ignorePatterns: ["abis/"],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  },
};
