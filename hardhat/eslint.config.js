import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['cache', 'artifacts', 'typechain-types']),
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [
      js.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        ethers: true,
        hardhat: true,
      },
    },
  },
  {
    files: ['test/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },
])
