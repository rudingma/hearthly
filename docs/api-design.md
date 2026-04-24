# Hearthly — API Design Decisions (GraphQL + NestJS)

> API architecture and conventions for the Hearthly NestJS modular monolith with Angular frontend.

---

## Decision: GraphQL

**Chosen over:** REST, tRPC

**Why GraphQL:**

- **Interconnected data model.** Household → members → (tasks, groceries, calendar, finance). Nearly every screen traverses this graph differently. GraphQL's resolver composition handles cross-module data naturally via `@ResolveField()`.
- **Modular monolith fit.** Each NestJS module defines its own types and resolvers independently. The schema is auto-composed at startup. Modules extend each other's types without coupling — the Budget module adds a `transactions` field to `Family` without the Family module knowing.
- **Frontend flexibility.** Different screens request exactly the data they need — one query per view, no over-fetching, no custom aggregate endpoints.
- **Additive evolution.** New modules add types and resolvers. Existing schema doesn't change. Deprecation via `@Field({ deprecationReason })` instead of API versioning.
- **End-to-end type safety.** Code-first schema + graphql-codegen gives the Angular frontend auto-generated TypeScript types matching exact query shapes.

**Why not REST:**

- REST handles cross-module data via multiple requests or custom BFF endpoints. With 7+ interconnected modules, this leads to endpoint proliferation and tight frontend-backend coupling.
- REST can achieve type safety via OpenAPI codegen, but types represent full resources, not query-specific shapes.

**Why not tRPC:**

- No official NestJS adapter. The community package (`nestjs-trpc`, 318 stars) is single-maintainer.
- tRPC's design guidance ecosystem is immature — no naming conventions, no versioning strategy, no pagination patterns, no published style guides.
- tRPC is optimized for Next.js full-stack monorepos, not NestJS + Angular.

---

## 1. Server & Schema Approach

**Server:** Apollo (`@nestjs/apollo` + `@apollo/server`)

- NestJS default driver, 21x community adoption over Mercurius
- Mature ecosystem: subscriptions, file uploads, complexity limiting, Apollo Sandbox playground
- Mercurius requires Fastify migration — unnecessary scope

**Schema approach:** Code-first

- Define schema via TypeScript decorators (`@ObjectType()`, `@Field()`, `@Query()`, `@Mutation()`)
- `autoSchemaFile: true` keeps the schema in memory at runtime (avoids file-watcher restart loops in dev)
- Each module defines its own types and resolvers — no shared SDL files to coordinate
- A separate `generate-schema` Nx target writes `schema.gql` to disk for codegen (see Section 6)

**Setup:**

```typescript
// app.module.ts
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

GraphQLModule.forRootAsync<ApolloDriverConfig>({
  driver: ApolloDriver,
  imports: [DataLoaderModule],
  inject: [DataLoaderRegistryFactory],
  useFactory: (loaderFactory: DataLoaderRegistryFactory) => ({
    autoSchemaFile: true, // in-memory — file-based causes dev server restart loops
    sortSchema: true,
    playground: false, // use Apollo Sandbox instead
    context: ({ req, res }) => ({
      req,
      res,
      loaders: loaderFactory.create(),
    }),
  }),
});
```

**Security:** Query depth limiting (`graphql-depth-limit`, max 7) and complexity analysis (`graphql-query-complexity`, max 1000) are configured as `validationRules` in the GraphQL module. Introspection is disabled in production. CORS is configured via `app.enableCors()` in `main.ts`.

**Schema generation for codegen:** The running server keeps the schema in memory only (`autoSchemaFile: true`). The `generate-schema` Nx target bootstraps a minimal NestJS context via `GraphQLSchemaBuilderModule` to write `schema.gql` to disk for codegen and CI. See Section 6 for the dependency chain.

**Dependencies (backend):**

```
@nestjs/graphql@^13  @nestjs/apollo@^13  @apollo/server@^5  graphql@^16
```

---

## 2. Naming Conventions

Based on GitHub, Shopify, and Apollo conventions. One clear rule per decision.

### Queries

Singular noun for single items, plural for lists. No `get` prefix.

```graphql
family(id: ID!): Family
families(limit: Int, offset: Int): PaginatedFamilies!
```

### Mutations

Verb-first camelCase. Specific verbs for domain actions — never generic `update` for business operations.

```graphql
createFamily(input: CreateFamilyInput!): CreateFamilyResult!
completeChore(input: CompleteChoreInput!): CompleteChoreResult!
assignChore(input: AssignChoreInput!): AssignChoreResult!
inviteMember(input: InviteMemberInput!): InviteMemberResult!
```

### Fields

camelCase everywhere. Relationship fields use the related type name, no parent prefix.

```graphql
type Family {
  id: ID!
  name: String!
  createdAt: DateTime!
  members: [FamilyMember!]! # NOT familyMembers
  chores: [Chore!]! # NOT familyChores
  createdBy: User! # role prefix when disambiguating
}
```

### Input Types

`<Verb><Noun>Input` — mirrors the mutation name. One input per mutation, never shared.

```graphql
input CreateFamilyInput {
  name: String!
}
input CompleteChoreInput {
  choreId: ID!
  note: String
}
```

### Payload Types (Relay-style convention)

**Every mutation returns a named payload type** `<Verb><Noun>Payload`. Not a union, not the bare entity. Payload types are extensible — future fields attach without breaking changes (e.g., server-side timestamps, related entities, optimistic-concurrency tokens). This matches the convention used by GitHub's GraphQL API and much of Shopify's Admin API.

```graphql
input CreateFamilyInput {
  name: String!
  clientMutationId: String!
}

type CreateFamilyPayload {
  family: Family!
}

type Mutation {
  createFamily(input: CreateFamilyInput!): CreateFamilyPayload!
}
```

**Every mutation input carries `clientMutationId: String!`.** Client generates a v4 UUID per submit (via `crypto.randomUUID()`). Purpose: platform-level idempotency — the server-side idempotency middleware (a Postgres-backed `idempotency_keys` table, landed as a separate platform workstream) uses this key to transparently dedupe retries across all mutations. Validation: length + charset only (`@IsString() @Length(1, 128) @Matches(/^[\w\-:.]+$/)`). The charset constraint is also a log-injection safeguard — services embed clientMutationId into logfmt log lines. The platform workstream (#119) may tighten to a canonical format (UUID v4 / ULID / prefixed opaque) later; if so, the validator tightens at that point. Adding this field universally now — before the app has dozens of mutations — is cheap; adding it later is a breaking change for every existing mutation.

### Typed domain errors

When a mutation has typed domain errors (e.g., `FamilyNameTakenError`), surface them in one of two patterns:

**Pattern A — `userErrors` field on the payload (Shopify-style):**

```graphql
type CreateFamilyPayload {
  family: Family
  userErrors: [UserError!]!
}
```

The consumer checks `userErrors` first; if non-empty, `family` is null. Extensible — you can add new error _types_ without schema changes.

**Pattern B — union discriminator wrapping the payload (Apollo-style):**

```graphql
union CreateFamilyResult = CreateFamilyPayload | FamilyNameTakenError
type Mutation {
  createFamily(input: CreateFamilyInput!): CreateFamilyResult!
}
```

Pattern A is preferred when error cases are an open set that may grow. Pattern B is preferred when the error cases are a fixed, well-bounded set. Pick once, stay consistent within a mutation's lifetime — migrating A→B is a breaking schema change.

### Type Namespacing

Prefix types only when the bare name is ambiguous in the unified schema.

- **Prefix needed:** `BudgetTransaction`, `BudgetCategory`, `MealPlan` (generic nouns)
- **No prefix:** `Family`, `Chore`, `Recipe`, `User` (unambiguous domain concepts)

---

## 3. Error Handling

**Three-tier approach:** validation at the framework level, domain errors as union types, infrastructure errors as exceptions.

### Input Validation

Handled by a global `ValidationPipe` wired via `APP_PIPE` + `useFactory` (DI-friendly — participates in the NestJS DI lifecycle, unlike `useValue` which creates the pipe before the container is ready). Configured in `apps/hearthly-api/src/app/app.module.ts`:

```typescript
{
  provide: APP_PIPE,
  useFactory: () =>
    new ValidationPipe({
      transform: true,
      whitelist: true,              // strip unknown properties — mass-assignment defense
      forbidNonWhitelisted: true,   // throw on unknown properties — fail loudly
      transformOptions: { enableImplicitConversion: false }, // explicit types only
      validationError: { target: false }, // omit the DTO instance from error responses (DTO-leak prevention)
    }),
}
```

Every `@InputType()` DTO is validated automatically before the resolver runs. Invalid inputs never reach resolver code — GraphQL returns errors in the `errors` array. Field-level validation uses `class-validator` decorators (`@IsString`, `@Length`, `@Matches`, `@MinLength`, `@MaxLength`) and `class-transformer` for coercion (`@Transform`). See `apps/hearthly-api/src/modules/household/inputs/create-household.input.ts` for a worked example.

**Config validation uses Zod** (not `class-validator`) — see `apps/hearthly-api/src/config/`. The split is intentional: Zod validates environment at startup time (non-DI context); `class-validator` validates request inputs at runtime (DI context, globally via `APP_PIPE`).

### Domain Errors

Union result types. Each mutation declares its possible outcomes — the success case and typed error cases. The frontend gets compile-time exhaustive handling via codegen.

```typescript
// NestJS code-first

@InterfaceType()
export abstract class BaseError {
  @Field()
  message: string;
}

@ObjectType({ implements: () => [BaseError] })
export class FamilyNameTakenError extends BaseError {
  constructor() {
    super();
    this.message = 'A family with this name already exists.';
  }
}

@ObjectType()
export class CreateFamilySuccess {
  @Field(() => Family)
  family: Family;
}

export const CreateFamilyResult = createUnionType({
  name: 'CreateFamilyResult',
  types: () => [CreateFamilySuccess, FamilyNameTakenError] as const,
});

// Resolver — must return class instances (not plain objects) for union resolveType to work
@Mutation(() => CreateFamilyResult)
async createFamily(@Args('input') input: CreateFamilyInput): Promise<typeof CreateFamilyResult> {
  const result = await this.familyService.create(input);
  switch (result.kind) {
    case 'success': {
      const success = new CreateFamilySuccess();
      success.family = result.family;
      return success;
    }
    case 'name_taken':
      return new FamilyNameTakenError();
  }
}
```

**Service layer stays framework-agnostic** — services return plain TypeScript discriminated unions (`{ kind: 'success', ... } | { kind: 'name_taken' }`). The resolver maps these to GraphQL types. No GraphQL imports in the service layer.

### Infrastructure Errors

Database failures, unhandled exceptions, etc. These bubble up as exceptions, NestJS serializes them into the GraphQL `errors` array, and the frontend shows a generic error message.

**Error message extraction:** use `errMessage(unknown)` from `apps/hearthly-api/src/common/error-utils.ts` to safely extract a string from any thrown value — handles `Error` instances, plain objects with `message`, and primitives. Replaces hand-rolled `error instanceof Error ? error.message : 'Unknown error'`.

### Frontend Consumption

```graphql
mutation CreateFamily($input: CreateFamilyInput!) {
  createFamily(input: $input) {
    __typename
    ... on CreateFamilySuccess {
      family {
        id
        name
      }
    }
    ... on FamilyNameTakenError {
      message
    }
  }
}
```

```typescript
// Angular component — codegen gives exhaustive types
switch (result.__typename) {
  case 'CreateFamilySuccess':
    this.router.navigate(['/families', result.family.id]);
    break;
  case 'FamilyNameTakenError':
    this.errorMessage = result.message;
    break;
}
```

---

## 4. Pagination

**Simple offset pagination.** Right-sized for Hearthly's small datasets (families of 2-8, grocery lists of 20-50, hundreds of transactions).

### Generic Types

```typescript
// Shared interface
export interface IPaginatedResponse<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

// PaginatedResponse factory — one line per entity to create a typed paginated response

export function PaginatedResponse<T>(
  classRef: Type<T>
): Type<IPaginatedResponse<T>> {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedResponseClass implements IPaginatedResponse<T> {
    @Field(() => [classRef])
    items: T[];

    @Field(() => Int)
    totalCount: number;

    @Field()
    hasMore: boolean;
  }
  return PaginatedResponseClass as Type<IPaginatedResponse<T>>;
}

// Per entity — one line
@ObjectType()
export class PaginatedTransactions extends PaginatedResponse(Transaction) {}
```

### Pagination Args

```typescript
@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: 20 })
  @Min(1)
  @Max(100)
  limit: number = 20;

  @Field(() => Int, { defaultValue: 0 })
  @Min(0)
  offset: number = 0;
}
```

### Resulting Schema

```graphql
type PaginatedTransactions {
  items: [Transaction!]!
  totalCount: Int!
  hasMore: Boolean!
}

type Query {
  transactions(limit: Int! = 20, offset: Int! = 0): PaginatedTransactions!
}
```

### Drizzle Integration

```typescript
const [items, countResult] = await Promise.all([
  db
    .select()
    .from(transactions)
    .where(condition)
    .orderBy(desc(transactions.createdAt))
    .limit(args.limit)
    .offset(args.offset),
  db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(condition),
]);
return {
  items,
  totalCount: Number(countResult[0].count),
  hasMore: args.offset + args.limit < totalCount,
};
```

### Filtering & Sorting

Add per-entity filter and sort inputs as needed. Naming convention: `<Noun>Filter` and `<Noun>Sort`.

```graphql
input TransactionFilter {
  category: String
  dateFrom: DateTime
  dateTo: DateTime
  memberId: ID
}

enum TransactionSortField {
  CREATED_AT
  AMOUNT
}
enum SortDirection {
  ASC
  DESC
}

input TransactionSort {
  field: TransactionSortField!
  direction: SortDirection! = DESC
}

type Query {
  transactions(
    filter: TransactionFilter
    sort: TransactionSort
    limit: Int! = 20
    offset: Int! = 0
  ): PaginatedTransactions!
}
```

Define these per module as needed — no upfront generic filter framework. `SortDirection` enum is shared; filter and sort field types are entity-specific.

---

## 5. DataLoader Pattern

**Plain `dataloader` npm package + GraphQL context factory.** No third-party NestJS wrapper (all are abandoned or trivially thin).

### Architecture

- A singleton `DataLoaderRegistryFactory` creates a fresh `DataLoaderRegistry` per request
- The registry is injected into GraphQL context via `GraphQLModule.forRootAsync()`
- Resolvers access loaders via `@Context('loaders')`
- All services remain singletons (no `Scope.REQUEST` cascade)
- DataLoader batch functions safely use `TransactionHost.tx` (AsyncLocalStorage propagates through the batch)

### DataLoaderRegistryFactory (complete wiring)

```typescript
// common/dataloader/dataloader-registry.factory.ts
@Injectable()
export class DataLoaderRegistryFactory {
  constructor(
    private readonly familyService: FamilyService // inject more services as modules grow
  ) {}

  create(): DataLoaderRegistry {
    return new DataLoaderRegistry(this.familyService);
  }
}

// common/dataloader/dataloader.module.ts
@Module({
  imports: [FamilyModule], // import modules whose services loaders need
  providers: [DataLoaderRegistryFactory],
  exports: [DataLoaderRegistryFactory],
})
export class DataLoaderModule {}
```

The factory is a singleton. `create()` is called per request in the GraphQL context callback (see Section 1 setup). Each `DataLoaderRegistry` instance holds lazy-initialized DataLoader instances that share the request scope.

### Per-Module Loader

```typescript
// In the DataLoaderRegistry (common/dataloader/)
get householdMembersLoader(): DataLoader<string, Member[]> {
  return this.getOrCreate('householdMembers', () =>
    new DataLoader<string, Member[]>(async (householdIds) => {
      const members = await this.householdService.findMembersByHouseholdIds([...householdIds]);
      return householdIds.map(id => members.filter(m => m.householdId === id));
    }),
  );
}
```

### Resolver Usage

```typescript
@Resolver(() => Household)
export class HouseholdResolver {
  @ResolveField(() => [Member])
  async members(
    @Parent() household: Household,
    @Context('loaders') loaders: DataLoaderRegistry
  ): Promise<Member[]> {
    return loaders.householdMembersLoader.load(household.id);
  }
}
```

### Compatibility with nestjs-cls

DataLoader batch functions execute in the same async context as the request. `TransactionHost.tx` resolves correctly inside batch functions — no special wiring needed.

---

## 6. Angular Client & Codegen

### Client: apollo-angular v13

- Stable, production-proven, maintained by The Guild
- Generates injectable Angular services via codegen
- Works with Angular 21 (use `toSignal()` for signals where needed)
- Normalized caching via `InMemoryCache` (simple configuration, auto-updates after mutations)

**Note:** TanStack Query Angular (`@tanstack/angular-query-experimental`) is signals-native and lighter, but still labeled "experimental." Consider migrating when it reaches stable — the `.graphql` files and generated types would carry over.

### Codegen: graphql-codegen with `typescript-apollo-angular` plugin

**Schema source:** Read the `schema.gql` file generated by NestJS (no running server needed).

**`.graphql` files:** Co-located with Angular components per feature.

```
apps/hearthly-app/src/app/
  households/
    graphql/
      get-households.graphql
      create-household.graphql
    household-list.ts
  members/
    graphql/
      get-members.graphql
```

**Generated output:** Single file at `apps/hearthly-app/src/generated/graphql.ts`, gitignored (regenerated by `graphql-codegen` Nx target). The `schema.gql` file is committed — it represents the API contract and is validated in CI.

**Codegen config** (at workspace root for consistent path resolution):

```typescript
// codegen.ts (workspace root)
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
```

**Nx integration:** The dependency chain is: `generate-schema` (API) → `graphql-codegen` (App) → `build` (App). The `generate-schema` target bootstraps a minimal NestJS context to write `schema.gql` without starting the full server, so codegen works in CI without a running API.

**Dependencies (frontend):**

```
@apollo/client@^4  apollo-angular@^13  graphql@^16
```

**Dev dependencies (codegen):**

```
@graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-apollo-angular
```

### Apollo Client Setup

```typescript
// apps/hearthly-app/src/app/app.config.ts
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/core';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...existing providers
    provideHttpClient(),
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      return {
        link: httpLink.create({ uri: '/graphql' }),
        cache: new InMemoryCache(),
      };
    }),
  ],
};
```

### Component Usage

```typescript
// Angular component using generated injectable service
@Component({ ... })
export class HouseholdListComponent {
  private readonly getHouseholdsGQL = inject(GetHouseholdsGQL);

  households$ = this.getHouseholdsGQL
    .watch()
    .valueChanges.pipe(map(result => result.data.households));
}
```

---

## 7. Module Structure

How a feature module is organized with GraphQL:

```
apps/hearthly-api/src/modules/
  family/
    family.module.ts              # NestJS module
    family.service.ts             # Business logic (framework-agnostic)
    family.repository.ts          # Drizzle queries (uses TransactionHost)
    models/
      family.model.ts             # @ObjectType() — GraphQL type
      paginated-families.model.ts # PaginatedResponse(Family)
    inputs/
      create-family.input.ts      # @InputType()
    results/
      create-family.result.ts     # Union type + success/error types
    resolvers/
      family.resolver.ts          # @Query() and @Mutation()
    loaders/
      family.loader.ts            # DataLoader batch function (if needed)
    schema/
      family.table.ts             # Drizzle pgTable definition
      family.relations.ts         # Drizzle relations()
      index.ts                    # Re-exports
```

**Key boundaries:**

- `models/`, `inputs/`, `results/`, `resolvers/` — GraphQL layer (depends on service)
- `family.service.ts` — business logic (returns plain TypeScript types, no GraphQL imports)
- `family.repository.ts` — data access (uses TransactionHost, returns plain objects)
- `schema/` — Drizzle table definitions (no GraphQL or NestJS imports)

---

## References

- [NestJS GraphQL docs](https://docs.nestjs.com/graphql/quick-start)
- [Apollo Server docs](https://www.apollographql.com/docs/apollo-server/)
- [graphql-codegen Angular guide](https://the-guild.dev/graphql/codegen/docs/guides/angular)
- [Shopify GraphQL Design Tutorial](https://github.com/Shopify/graphql-design-tutorial)
- [Production Ready GraphQL (Marc-Andre Giroux)](https://book.productionreadygraphql.com/)
- [Drizzle ORM docs](https://orm.drizzle.team/)
- [nestjs-cls Transactional plugin](https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional)
- [DataLoader GitHub](https://github.com/graphql/dataloader)
