import axios, { AxiosRequestConfig, isAxiosError } from "axios";
import { HTTP } from "@pretzel-graph/node-sdk";
import { Execution } from "@pretzel-graph/shared/domain";

const DEFAULT_TIMEOUT_MS  = 30_000;
const DEFAULT_RETRIES     = 2;
const MAX_BODY_CHARS      = 500;
const RETRYABLE_STATUSES  = new Set([408, 425, 429, 500, 502, 503, 504]);


// Response body as short text for the error message; caps a vendor's 2MB error page.
const stringifyBody = (body: unknown): string => {

    if (body === undefined || body === null || body === "")
        return "";

    let text: string;

    // A circular body must not throw here — this runs while building an error.
    try {
        text = typeof body === "string"
            ? body
            : JSON.stringify(body) ?? "";
    }
    catch {
        return "[unserializable body]";
    }

    if (text.length > MAX_BODY_CHARS)
        return `${text.slice(0, MAX_BODY_CHARS)}…`;

    return text;
};


// Anything axios throws -> one HTTP.Error shape, so no integration hand-rolls its own formatter.
const toHTTPError = (vendor: string, err: unknown): HTTP.Error => {

    if (!isAxiosError(err))
        return new HTTP.Error(
            err instanceof Error ? err.message : String(err),
            vendor, "?", "?",
        );

    const method = (err.config?.method ?? "?").toUpperCase();
    const url    = err.config?.url ?? "?";
    const status = err.response?.status;
    const body   = err.response?.data;

    const outcome = status
        ? ` -> ${status}${err.response?.statusText ? ` ${err.response.statusText}` : ""}`
        : ` (${err.code ?? "network error"})`;

    const bodyText = stringifyBody(body);
    const suffix   = bodyText ? ` Response: ${bodyText}` : "";

    return new HTTP.Error(
        `${vendor} request failed: ${method} ${url}${outcome}.${suffix}`,
        vendor, method, url, status, body,
    );
};


// Retry transient failures and network errors; never a 4xx, and never an abort. A request may
// narrow this further via `retryable`, but never widen it.
const isRetryable = (err: unknown): boolean => {

    if (!isAxiosError(err) || err.code === "ERR_CANCELED")
        return false;

    const status = err.response?.status;
    const narrow = (err.config as HTTP.RequestConfig | undefined)?.retryable;

    if (narrow && !narrow(status, err.response?.data))
        return false;

    if (status === undefined)
        return true;

    return RETRYABLE_STATUSES.has(status);
};


// Retry-After (seconds or HTTP-date) wins; else 500ms..8s exponential. Jitter keeps parallel
// nodes off the same rate limit from retrying in lockstep.
const backoffMs = (attempt: number, retryAfter: unknown): number => {

    if (typeof retryAfter === "string") {

        const seconds = Number(retryAfter);

        if (Number.isFinite(seconds))
            return Math.min(seconds * 1000, 30_000);

        const date = Date.parse(retryAfter);

        if (!Number.isNaN(date))
            return Math.min(Math.max(date - Date.now(), 0), 30_000);
    }

    return Math.min(2 ** (attempt - 1) * 500, 8_000) + Math.random() * 250;
};


// Abortable delay — a bare setTimeout would hold the execution open through teardown.
const sleep = (ms: number, signal: AbortSignal) =>

    new Promise<void>((resolve, reject) => {

        if (signal.aborted)
            return reject(signal.reason);

        const onAbort = () => {
            clearTimeout(timer);
            reject(signal.reason);
        };

        const timer = setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        }, ms);

        signal.addEventListener("abort", onAbort, { once: true });
    });


export function createHTTPClientAPI(executionSignal: AbortSignal): HTTP.ClientAPI {

    return {

        create: ({ vendor = "HTTP", retries = DEFAULT_RETRIES, proxy, ...axiosConfig } = {}) => {

            const instance = axios.create({
                timeout: DEFAULT_TIMEOUT_MS,
                ...axiosConfig,

                // Last, so a caller's own agents can't silently un-proxy the node.
                // `proxy: false` stops axios layering HTTP(S)_PROXY env handling on top.
                ...(proxy && {
                    httpAgent:  proxy.http,
                    httpsAgent: proxy.https,
                    proxy:      false as const,
                }),
            });


            // Bind every request to the execution's abort signal, combining with a
            // caller-supplied one rather than clobbering it.
            instance.interceptors.request.use((config) => {

                const caller = config.signal as AbortSignal | undefined;

                config.signal = !caller || caller === executionSignal
                    ? executionSignal
                    : AbortSignal.any([caller, executionSignal]);

                return config;
            });


            // Retry loop, then normalize. __attempt rides on the config so it survives
            // the re-request.
            instance.interceptors.response.use(undefined, async (err) => {

                const config = err?.config as (AxiosRequestConfig & { __attempt?: number }) | undefined;
                const attempt = config?.__attempt ?? 0;

                if (config && retries > 0 && attempt < retries && isRetryable(err)) {

                    config.__attempt = attempt + 1;

                    const retryAfter = err.response?.headers?.["retry-after"];

                    await sleep(backoffMs(config.__attempt, retryAfter), executionSignal);

                    return instance.request(config);
                }

                throw toHTTPError(vendor, err);
            });


            return {

                get: <T>(url: string, config?: HTTP.RequestConfig) =>
                    instance.get<T>(url, config).then(r => r.data),

                post: <T>(url: string, data?: unknown, config?: HTTP.RequestConfig) =>
                    instance.post<T>(url, data, config).then(r => r.data),

                put: <T>(url: string, data?: unknown, config?: HTTP.RequestConfig) =>
                    instance.put<T>(url, data, config).then(r => r.data),

                patch: <T>(url: string, data?: unknown, config?: HTTP.RequestConfig) =>
                    instance.patch<T>(url, data, config).then(r => r.data),

                delete: <T>(url: string, config?: HTTP.RequestConfig) =>
                    instance.delete<T>(url, config).then(r => r.data),

                raw: instance,
            };
        },
    };
}


/**
 * The client nodes use to reach our own backend, authenticated as one execution.
 *
 * Not built through `RuntimeNode.httpClientFactory` on purpose — that binds the node's
 * proxy credential, and routing this traffic through a user-configured proxy would hand
 * the execution token to whoever operates it. Third-party egress is proxied; internal
 * calls are not. See SPECS/execution-token-delegation.md.
 */
export function createInternalClient(executionToken: Execution.Token): HTTP.Client {

    return createHTTPClientAPI(new AbortController().signal).create({
        vendor:  "Pretzel backend",
        baseURL: process.env.API_URL,
        headers: { [Execution.Token.HEADER]: executionToken },
    });
}
