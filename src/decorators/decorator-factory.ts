import 'reflect-metadata';

export type DecoratorOptions = {
  name?: string;
  description?: string;
  [key: string]: unknown;
};

export type MetadataProcessor<TOptions, TMetadata> = (
  options: TOptions,
  propertyKey: string
) => TMetadata;

export type MetadataSetter<TMetadata> = (
  target: object,
  propertyKey: string,
  metadata: TMetadata
) => void;

export type OptionsNormalizer<TOptions> = (input: string | TOptions) => TOptions;

/**
 * Creates a decorator function with consistent handling of overloaded signatures.
 * Reduces boilerplate across all decorator implementations.
 */
export function createDecorator<TOptions extends DecoratorOptions, TMetadata>(
  metadataSetter: MetadataSetter<TMetadata>,
  metadataProcessor: MetadataProcessor<TOptions, TMetadata>,
  defaultOptionsNormalizer?: OptionsNormalizer<TOptions>
) {
  const normalizer =
    defaultOptionsNormalizer ||
    ((input: string | TOptions) => {
      if (typeof input === 'string') {
        return { name: input } as TOptions;
      }
      return input;
    });

  // Handle both @Decorator and @Decorator('name') patterns
  return function decorator(
    optionsOrTarget: TOptions | object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor
  ) {
    // Direct usage without arguments: @Decorator
    if (
      typeof optionsOrTarget === 'object' &&
      propertyKey !== undefined &&
      descriptor !== undefined
    ) {
      const target = optionsOrTarget;
      const key = propertyKey.toString();
      const metadata = metadataProcessor({} as TOptions, key);
      metadataSetter(target, key, metadata);
      return descriptor;
    }

    // Usage with arguments: @Decorator('name') or @Decorator({ name: 'name' })
    return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
      const key = propertyKey.toString();
      const options = normalizer(optionsOrTarget as string | TOptions);
      const metadata = metadataProcessor(options, key);
      metadataSetter(target, key, metadata);
      return descriptor;
    };
  };
}

/**
 * Creates a decorator function specifically for single string argument pattern.
 * Common pattern for @Tool('name', 'description') style decorators.
 */
export function createSimpleDecorator<TMetadata>(
  metadataSetter: MetadataSetter<TMetadata>,
  metadataProcessor: (name: string, description: string, propertyKey: string) => TMetadata
) {
  return function decorator(name: string, description?: string) {
    return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
      const key = propertyKey.toString();
      const metadata = metadataProcessor(name, description || '', key);
      metadataSetter(target, key, metadata);
      return descriptor;
    };
  };
}
