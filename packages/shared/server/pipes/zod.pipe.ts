import { PipeTransform, Injectable, ArgumentMetadata, Body, Param } from '@nestjs/common';
import { ZodType, z } from 'zod';

@Injectable()
export class ZodPipe<T> implements PipeTransform<unknown, T> {
    constructor(private readonly schema: ZodType<T>) {}

    transform(value: unknown, _metadata: ArgumentMetadata): T {
        return this.schema.parse(value);
    }
}

export const ZodBody = <T>(schema: ZodType<T>) => Body(new ZodPipe(schema));
export const ZodStringBody = (field: string) => Body(field, new ZodPipe(z.string()));

/** A branded id straight off the path — the param equivalent of ZodBody. */
export const ZodParam = <T>(name: string, schema: ZodType<T>) => Param(name, new ZodPipe(schema));
