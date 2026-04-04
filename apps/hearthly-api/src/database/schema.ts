// Central barrel file — re-exports all module schemas.
// Drizzle Kit needs a single entry point for migration generation,
// and the Drizzle client needs all schemas to resolve relations.
//
// When adding a new module with tables, add a re-export here:
//   export * from '../modules/<name>/schema';

// Placeholder table from initial setup (will be replaced by real module schemas)
export { healthCheck } from './health-check.table';
