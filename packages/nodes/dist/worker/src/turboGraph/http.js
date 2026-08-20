"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHTTPClientAPI = createHTTPClientAPI;
exports.createInternalClient = createInternalClient;
const axios_1 = __importStar(require("axios"));
const node_sdk_1 = require("../../../node-sdk/src/index.js");
const domain_1 = require("../../../shared/domain");
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;
const MAX_BODY_CHARS = 500;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
// Response body as short text for the error message; caps a vendor's 2MB error page.
const stringifyBody = (body) => {
    if (body === undefined || body === null || body === "")
        return "";
    let text;
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
const toHTTPError = (vendor, err) => {
    if (!(0, axios_1.isAxiosError)(err))
        return new node_sdk_1.HTTP.Error(err instanceof Error ? err.message : String(err), vendor, "?", "?");
    const method = (err.config?.method ?? "?").toUpperCase();
    const url = err.config?.url ?? "?";
    const status = err.response?.status;
    const body = err.response?.data;
    const outcome = status
        ? ` -> ${status}${err.response?.statusText ? ` ${err.response.statusText}` : ""}`
        : ` (${err.code ?? "network error"})`;
    const bodyText = stringifyBody(body);
    const suffix = bodyText ? ` Response: ${bodyText}` : "";
    return new node_sdk_1.HTTP.Error(`${vendor} request failed: ${method} ${url}${outcome}.${suffix}`, vendor, method, url, status, body);
};
// Retry transient failures and network errors; never a 4xx, and never an abort. A request may
// narrow this further via `retryable`, but never widen it.
const isRetryable = (err) => {
    if (!(0, axios_1.isAxiosError)(err) || err.code === "ERR_CANCELED")
        return false;
    const status = err.response?.status;
    const narrow = err.config?.retryable;
    if (narrow && !narrow(status, err.response?.data))
        return false;
    if (status === undefined)
        return true;
    return RETRYABLE_STATUSES.has(status);
};
// Retry-After (seconds or HTTP-date) wins; else 500ms..8s exponential. Jitter keeps parallel
// nodes off the same rate limit from retrying in lockstep.
const backoffMs = (attempt, retryAfter) => {
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
const sleep = (ms, signal) => new Promise((resolve, reject) => {
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
function createHTTPClientAPI(executionSignal) {
    return {
        create: ({ vendor = "HTTP", retries = DEFAULT_RETRIES, proxy, ...axiosConfig } = {}) => {
            const instance = axios_1.default.create({
                timeout: DEFAULT_TIMEOUT_MS,
                ...axiosConfig,
                // Last, so a caller's own agents can't silently un-proxy the node.
                // `proxy: false` stops axios layering HTTP(S)_PROXY env handling on top.
                ...(proxy && {
                    httpAgent: proxy.http,
                    httpsAgent: proxy.https,
                    proxy: false,
                }),
            });
            // Bind every request to the execution's abort signal, combining with a
            // caller-supplied one rather than clobbering it.
            instance.interceptors.request.use((config) => {
                const caller = config.signal;
                config.signal = !caller || caller === executionSignal
                    ? executionSignal
                    : AbortSignal.any([caller, executionSignal]);
                return config;
            });
            // Retry loop, then normalize. __attempt rides on the config so it survives
            // the re-request.
            instance.interceptors.response.use(undefined, async (err) => {
                const config = err?.config;
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
                get: (url, config) => instance.get(url, config).then(r => r.data),
                post: (url, data, config) => instance.post(url, data, config).then(r => r.data),
                put: (url, data, config) => instance.put(url, data, config).then(r => r.data),
                patch: (url, data, config) => instance.patch(url, data, config).then(r => r.data),
                delete: (url, config) => instance.delete(url, config).then(r => r.data),
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
function createInternalClient(executionToken) {
    return createHTTPClientAPI(new AbortController().signal).create({
        vendor: "Pretzel backend",
        baseURL: process.env.API_URL,
        headers: { [domain_1.Execution.Token.HEADER]: executionToken },
    });
}
