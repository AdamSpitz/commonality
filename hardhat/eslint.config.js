import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['cache', 'artifacts', 'typechain-types']),
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [
      js.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        node: true,
        ethers: true,
        hardhat: true,
      },
    },
  },
])
