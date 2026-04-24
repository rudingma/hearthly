import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
  GraphQLISODateTime,
} from '@nestjs/graphql';
import { printSchema, lexicographicSortSchema } from 'graphql';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { UserResolver } from './modules/user/resolvers/user.resolver';
import { HouseholdResolver } from './modules/household/resolvers/household.resolver';

async function generateSchema() {
  const app = await NestFactory.create(GraphQLSchemaBuilderModule, {
    logger: false,
  });
  await app.init();

  const gqlSchemaFactory = app.get(GraphQLSchemaFactory);
  const schema = await gqlSchemaFactory.create(
    [UserResolver, HouseholdResolver],
    {
      scalarsMap: [{ type: () => Date, scalar: GraphQLISODateTime }],
    }
  );

  // Sort the schema to match `sortSchema: true` in AppModule
  const sorted = lexicographicSortSchema(schema);
  const sdl = printSchema(sorted);

  const header = `# ------------------------------------------------------
# THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
# ------------------------------------------------------

`;

  const outputPath = join(process.cwd(), 'apps/hearthly-api/src/schema.gql');
  writeFileSync(outputPath, header + sdl + '\n');

  console.log(`Schema written to ${outputPath}`);
  await app.close();
}

generateSchema().catch((err) => {
  console.error('Failed to generate schema:', err);
  process.exit(1);
});
