declare module 'graphql-depth-limit' {
  import type { ValidationRule } from 'graphql';

  interface Options {
    ignore?: Array<string | RegExp | ((queryDepths: Record<string, number>) => boolean)>;
  }

  function depthLimit(
    maxDepth: number,
    options?: Options,
    callback?: (queryDepths: Record<string, number>) => void,
  ): ValidationRule;

  export default depthLimit;
}
