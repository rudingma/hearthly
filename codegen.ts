import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'apps/hearthly-api/src/schema.gql',
  documents: 'apps/hearthly-app/src/**/*.graphql',
  generates: {
    'apps/hearthly-app/src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-apollo-angular',
      ],
      config: {
        useTypeImports: true,
        serviceProvidedInRoot: true,
        scalars: {
          DateTime: 'string',
          ID: 'string',
        },
      },
    },
  },
};
export default config;
