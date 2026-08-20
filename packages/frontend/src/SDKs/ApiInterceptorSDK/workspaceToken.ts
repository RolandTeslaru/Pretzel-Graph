import axios from "axios";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import type { AuthSDKImpl } from "../AuthSDK/sdk";

/**
 * Some deployments exchange the session for a short-lived token scoped to this
 * deployment; others accept the session directly. Which kind this is can only
 * be learned by asking, so the first request asks and the answer is remembered.
 */

const EXCHANGE_PATH = "/api/session/token";

/** Re-mint this many seconds before expiry, so a token never dies mid-request. */
const EARLY_S = 60;

type Mode = "unknown" | "scoped" | "session";

let mode: Mode = "unknown";
let cached: { token: string; expiresAt: number } | null = null;
let inflight: Promise<string | null> | null = null;

const sessionToken = () => SDK.get<AuthSDKImpl>("Auth").getToken();

async function mint(): Promise<string | null> {
    const session = await sessionToken();

    if (!session)
        return null;

    try {
        // Same base URL as every other API call, so the probe lands wherever
        // the API actually is rather than on whatever serves the page.
        const { data } = await axios.post<{ token: string; expiresAt: number }>(
            EXCHANGE_PATH,
            {},
            { baseURL: import.meta.env.VITE_API_URL, headers: { Authorization: `Bearer ${session}` } },
        );

        // A proxy answering 200 with something else must not flip the mode.
        if (typeof data?.token !== "string" || typeof data?.expiresAt !== "number") {
            mode = "session";
            return null;
        }

        mode = "scoped";
        cached = data;

        return data.token;
    }
    catch (error) {
        // No exchange endpoint means the session is the token here.
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            mode = "session";
            return null;
        }

        // Anything else is transient or a denial: stay undecided and let the
        // request carry the session, which the backend will judge.
        return null;
    }
}

/** The token requests should carry right now. */
export async function getRequestToken(): Promise<string | null> {
    if (mode === "session")
        return sessionToken();

    if (cached && cached.expiresAt - EARLY_S > Date.now() / 1000)
        return cached.token;

    // Single-flight: a burst of requests must not become a burst of mints.
    inflight ??= mint().finally(() => { inflight = null; });

    const token = await inflight;

    return token;
}

/** Forces the next request to mint again. */
export function invalidateRequestToken(): void {
    cached = null;
}

/** Whether a rejected request is worth one retry on a fresh token. */
export function isScoped(): boolean {
    return mode === "scoped";
}
