import { ZodType } from 'zod';
import { SystemError, DatabaseError } from '@pretzel-graph/shared/domain/SystemError';

export function SupabaseAssert(operation: string): MethodDecorator {
    return function (_target, _key, descriptor: PropertyDescriptor) {
        const original = descriptor.value;
        descriptor.value = async function (...args: unknown[]) {
            try {
                return await original.apply(this, args);
            } catch (err) {
                if (err instanceof SystemError) throw err;
                const detail = err instanceof Error ? err.message : String(err);
                console.error(`Database error during ${operation}:`, err);
                throw new DatabaseError(
                    SystemError.Code.INFRA_DATABASE_ERROR,
                    'Something went wrong',
                    { detail: `[${operation}] ${detail}`, data: { operation } }
                );
            }
        };
        return descriptor;
    };
}

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
