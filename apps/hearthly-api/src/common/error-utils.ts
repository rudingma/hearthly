/**
 * Safely extract an error message from an unknown thrown value.
 *
 * Handles:
 * - Error instances (and subclasses like DOMException)
 * - Plain objects with a `message` property (common for throws-as-object)
 * - null / undefined (returns "null" / "undefined")
 * - Strings, numbers, etc. (coerced via String())
 */
export function errMessage(e: unknown): string {
  if (typeof e === 'object' && e && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return String(e);
}
