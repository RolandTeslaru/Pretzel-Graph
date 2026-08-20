"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTP = void 0;
// Aliased so HTTP.Error can extend the global Error without self-referencing inside the namespace.
const BaseError = globalThis.Error;
var HTTP;
(function (HTTP) {
    /** Normalized failure for any outbound integration request. The message is safe to surface to
     *  the user / an LLM — credentials in the URL query are redacted before it is built. */
    class Error extends BaseError {
        vendor;
        method;
        url;
        status;
        body;
        constructor(message, vendor, method, url, status, body) {
            super(message);
            this.vendor = vendor;
            this.method = method;
            this.url = url;
            this.status = status;
            this.body = body;
            this.name = "HTTPError";
        }
    }
    HTTP.Error = Error;
})(HTTP || (exports.HTTP = HTTP = {}));
