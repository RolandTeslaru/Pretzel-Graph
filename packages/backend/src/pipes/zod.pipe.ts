import { PipeTransform, Injectable, ArgumentMetadata, Body } from '@nestjs/common';
import { ZodType } from 'zod';

@Injectable()
export class ZodPipe<T> implements PipeTransform<unknown, T> {
    constructor(private readonly schema: ZodType<T>) {}

    transform(value: unknown, _metadata: ArgumentMetadata): T {
        return this.schema.parse(value);
    }
}

export const ZodBody = <T>(schema: ZodType<T>) => Body(new ZodPipe(schema));
