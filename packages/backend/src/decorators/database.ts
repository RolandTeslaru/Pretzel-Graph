import { ZodType } from 'zod';

export function ZodReturn<T>(schema: ZodType<T>): MethodDecorator {
    return function (_target, _key, descriptor: PropertyDescriptor) {
        const original = descriptor.value;
        descriptor.value = async function (...args: unknown[]) {
            const result = await original.apply(this, args);
            return schema.parse(result);
        };
        return descriptor;
    };
}

export function ZodMap<TRaw, TOut>(schema: ZodType<TRaw>, mapper: (raw: TRaw) => TOut): MethodDecorator {
    return function (_target, _key, descriptor: PropertyDescriptor) {
        const original = descriptor.value;
        descriptor.value = async function (...args: unknown[]) {
            const result = await original.apply(this, args);
            return mapper(schema.parse(result));
        };
        return descriptor;
    };
}
