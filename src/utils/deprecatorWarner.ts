/**
 * A small utility function to log deprecation warnings in the console.
 * Uses the following string:
 * 
 * ```typescript
 * `⚠️ [DEPRECATION WARNING] ${deprecatedFeature} is deprecated. Use ${alternative || 'the recommended alternative'} instead.`
 * ```
 * @param deprecatedFeature 
 * @param alternative 
 */
export function deprecatorWarner(deprecatedFeature: string, alternative?: string): void {
  let message = `⚠️ [DEPRECATION WARNING] ${deprecatedFeature} is deprecated. Use ${alternative || 'the recommended alternative'} instead.`;
  console.warn(message);
}