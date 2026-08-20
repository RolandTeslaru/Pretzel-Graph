"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAPIParsing = withAPIParsing;
/**
 * Builds an API method whose input and output are inferred from its schemas.
 *
 * The caller supplies the request schema's input type. The handler receives
 * its parsed output type, and the returned promise resolves to the parsed
 * response schema's output type.
 */
function withAPIParsing(requestSchema, responseSchema, handler) {
    return (async (request) => {
        const parsedRequest = requestSchema.parse(request);
        const response = await handler(parsedRequest);
        return responseSchema.parse(response);
    });
}
