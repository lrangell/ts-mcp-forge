/**
 * Creates a generic metadata collector function for any metadata type.
 * Reduces duplication across getAllXMetadata functions.
 */
export function createMetadataCollector<T>(
  metadataGetter: (target: object, propertyKey: string) => T | undefined
) {
  return (target: object | Function): Map<string, T> => {
    const metadata = new Map<string, T>();
    const prototype = typeof target === 'function' ? target.prototype : target;

    Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
      if (propertyKey === 'constructor') return;

      const meta = metadataGetter(prototype, propertyKey);
      if (meta) {
        metadata.set(propertyKey, meta);
      }
    });

    return metadata;
  };
}

/**
 * Creates a metadata collector that filters by specific criteria.
 * Useful for collecting metadata with additional filtering logic.
 */
export function createFilteredMetadataCollector<T>(
  metadataGetter: (target: object, propertyKey: string) => T | undefined,
  filter: (metadata: T, propertyKey: string) => boolean
) {
  return (target: object | Function): Map<string, T> => {
    const metadata = new Map<string, T>();
    const prototype = typeof target === 'function' ? target.prototype : target;

    Object.getOwnPropertyNames(prototype).forEach((propertyKey) => {
      if (propertyKey === 'constructor') return;

      const meta = metadataGetter(prototype, propertyKey);
      if (meta && filter(meta, propertyKey)) {
        metadata.set(propertyKey, meta);
      }
    });

    return metadata;
  };
}

/**
 * Combines multiple metadata collectors into a single result.
 * Useful for collecting related metadata types together.
 */
export function combineMetadataCollectors<T extends Record<string, any>>(collectors: {
  [K in keyof T]: (target: object | Function) => Map<string, T[K]>;
}): (target: object | Function) => { [K in keyof T]: Map<string, T[K]> } {
  return (target: object | Function) => {
    const result = {} as { [K in keyof T]: Map<string, T[K]> };

    for (const key in collectors) {
      result[key] = collectors[key](target);
    }

    return result;
  };
}
