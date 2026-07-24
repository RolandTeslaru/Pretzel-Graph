import { z } from "zod"

type Awaitable<T> = T | Promise<T>

type ParsedAPIMethod<
    TRequest extends z.ZodType,
    TResponse extends z.ZodType,
> = undefined extends z.input<TRequest>
    ? (
        request?: z.input<TRequest>,
    ) => Promise<z.output<TResponse>>
    : (
        request: z.input<TRequest>,
    ) => Promise<z.output<TResponse>>

/**
 * Builds an API method whose input and output are inferred from its schemas.
 *
 * The caller supplies the request schema's input type. The handler receives
 * its parsed output type, and the returned promise resolves to the parsed
 * response schema's output type.
 */
export function withAPIParsing<
    const TRequest extends z.ZodType,
    const TResponse extends z.ZodType,
>(
    requestSchema: TRequest,
    responseSchema: TResponse,
    handler: (
        request: z.output<TRequest>,
    ) => Awaitable<unknown>,
): ParsedAPIMethod<TRequest, TResponse> {
    return (async (request?: z.input<TRequest>) => {
        const parsedRequest = requestSchema.parse(request)
        const response      = await handler(parsedRequest)

        return responseSchema.parse(response)
    }) as ParsedAPIMethod<TRequest, TResponse>
}
