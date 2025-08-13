import 'reflect-metadata';

/**
 * Generic metadata manager for handling decorator metadata using Railway Oriented Programming patterns
 */
export class MetadataManager<T> {
  private readonly metadataKey: symbol;

  constructor(metadataKey: symbol) {
    this.metadataKey = metadataKey;
  }

  /**
   * Sets metadata for a specific property
   */
  set(target: any, propertyKey: string, metadata: T): void {
    Reflect.defineMetadata(this.metadataKey, metadata, target, propertyKey);
  }

  /**
   * Gets metadata for a specific property
   */
  get(target: any, propertyKey: string): T | undefined {
    return Reflect.getMetadata(this.metadataKey, target, propertyKey);
  }

  /**
   * Gets all metadata of this type from a target
   */
  getAll(target: any): Map<string, T> {
    const metadata = new Map<string, T>();
    const prototype = typeof target === 'function' ? target.prototype : target;

    const propertyNames = [
      ...Object.getOwnPropertyNames(prototype),
      ...Object.getOwnPropertySymbols(prototype).map((s) => s.toString()),
    ];

    for (const propertyName of propertyNames) {
      const meta = this.get(prototype, propertyName);
      if (meta !== undefined) {
        metadata.set(propertyName, meta);
      }
    }

    return metadata;
  }

  /**
   * Checks if metadata exists for a property
   */
  has(target: any, propertyKey: string): boolean {
    return Reflect.hasMetadata(this.metadataKey, target, propertyKey);
  }

  /**
   * Deletes metadata for a property
   */
  delete(target: any, propertyKey: string): boolean {
    return Reflect.deleteMetadata(this.metadataKey, target, propertyKey);
  }
}

/**
 * Factory for creating typed metadata managers
 */
export function createMetadataManager<T>(key: string | symbol): MetadataManager<T> {
  const metadataKey = typeof key === 'string' ? Symbol(key) : key;
  return new MetadataManager<T>(metadataKey);
}
