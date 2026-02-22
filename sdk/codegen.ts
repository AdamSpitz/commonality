import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  // Committed copy of the Ponder-generated schema.
  // Update this file when ponder.schema.ts changes (run Ponder and copy
  // indexer/generated/schema.graphql here).
  schema: 'schema.graphql',
  documents: ['src/**/*.graphql'],
  // Phase 1: no document files yet — they'll be added in Phase 2
  ignoreNoDocuments: true,
  generates: {
    'src/generated/': {
      preset: 'client',
      presetConfig: {
        // Use 'gql' as the tag function name for inline queries (Phase 2+)
        gqlTagName: 'gql',
        // Fragment masking adds boilerplate we don't need
        fragmentMasking: false,
      },
      config: {
        // Use BigInt for the GraphQL BigInt scalar
        scalars: {
          BigInt: 'bigint',
        },
        // Use more idiomatic TypeScript (no __typename by default)
        skipTypename: true,
        // Don't suffix types with "Input" etc.
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
