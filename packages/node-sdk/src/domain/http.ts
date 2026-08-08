import type { AxiosInstance, AxiosRequestConfig, CreateAxiosDefaults } from "axios";
import type { NetworkProxy } from "./networkProxy";

// Aliased so HTTP.Error can extend the global Error without self-referencing inside the namespace.
const BaseError: ErrorConstructor = globalThis.Error;

export namespace HTTP {

    /** Normalized failure for any outbound integration request. The message is safe to surface to
     *  the user / an LLM — credentials in the URL query are redacted before it is built. */
    export class Error extends BaseError {
        constructor(
            message: string,
            public readonly vendor:  string,
            public readonly method:  string,
            public readonly url:     string,
            public readonly status?: number,
            public readonly body?:   unknown,
        ) {
            super(message);
            this.name = "HTTPError";
        }
    }

    /** Per-request config. Extends axios's own so any existing call site still type-checks. */
    export interface RequestConfig extends AxiosRequestConfig {
        /** Narrows the client's retry rule for this one request. Return false to treat an
         *  otherwise-retryable failure as permanent — some vendors answer a bad argument with a
         *  5xx, and retrying that only delays the error. Receives the response status (undefined
         *  for a network error) and the parsed body. */
        retryable?: (status: number | undefined, body: unknown) => boolean,
    }

    /** Thin client over an axios instance: verbs resolve to the response body, `raw` is the
     *  escape hatch for callers that need headers/status. */
    export interface Client {
        get:    <T>(url: string, config?: RequestConfig) => Promise<T>,
        post:   <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<T>,
        put:    <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<T>,
        patch:  <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<T>,
        delete: <T>(url: string, config?: RequestConfig) => Promise<T>,
        raw:    AxiosInstance,
    }

    export namespace Client {
        /** Omits axios's own transport keys: routing is owned by `proxy` below, so a caller
         *  cannot set agents directly and quietly bypass the node's proxy. */
        export interface Config extends Omit<CreateAxiosDefaults, "proxy" | "httpAgent" | "httpsAgent"> {
            /** Prefixes error messages so a failure names the third party, not just a URL. */
            vendor?:  string,
            /** Retries on 408/425/429/5xx and network errors. Default 2. Set 0 to disable. */
            retries?: number,
            /** Routes every request through the proxy. Set for you by
             *  `RuntimeNode.httpClientFactory` — nodes should not pass this themselves. */
            proxy?:   NetworkProxy.Agent,
        }
    }

    /** Factory handed to nodes via `ExecutionContext.httpAPI`. Every client it builds is bound to
     *  the execution's abort signal, so terminate/suspend cancels requests in flight. */
    export interface ClientAPI {
        create: (config?: Client.Config) => Client,
    }
}
