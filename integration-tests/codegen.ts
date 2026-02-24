import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  // Shared schema — same source as sdk/codegen.ts
  schema: '../sdk/schema.graphql',
  documents: ['src/**/*.graphql'],
  ignoreNoDocuments: true,
  generates: {
    'src/generated/': {
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
        fragmentMasking: false,
      },
      config: {
        scalars: { BigInt: 'bigint' },
        skipTypename: true,
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
