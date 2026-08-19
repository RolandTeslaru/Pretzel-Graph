/**
 * A Storage-shaped object backed by cookies rather than localStorage.
 *
 * localStorage is keyed by origin, so two apps on different hosts cannot see
 * each other's entries. Cookies are keyed by domain, so naming a shared parent
 * lets everything beneath it read the same value.
 *
 * Left without a domain the cookie is host-only, which behaves exactly like
 * localStorage did — so this is safe to adopt before deciding to share.
 */

/**
 * Where the session is kept. Shared so the apps that read each other's session
 * cannot drift onto different names — two keys means two sessions.
 */
export const PRETZEL_STORAGE_KEY = 'pretzel.auth.token';

export type CookieStorageOptions = {
    /** Naming a parent shares the value with everything under it. */
    domain?: string;
    /** Cookies expire; localStorage did not. A year, unless told otherwise. */
    maxAgeSeconds?: number;
};

export type CookieStorage = {
    getItem:    (key: string) => string | null;
    setItem:    (key: string, value: string) => void;
    removeItem: (key: string) => void;
};

/**
 * Browsers cap a cookie at roughly 4KB including its name and attributes, and a
 * session with a profile in it can approach that. Values are split across
 * numbered cookies well under the limit rather than being silently truncated.
 */
const CHUNK_SIZE = 3000;

const YEAR_SECONDS = 60 * 60 * 24 * 365;

const chunkName = (key: string, index: number) => `${key}.${index}`;

function readAll(): Map<string, string> {
    const jar = new Map<string, string>();

    for (const pair of document.cookie.split(';')) {
        const index = pair.indexOf('=');

        if (index < 0)
            continue;

        jar.set(pair.slice(0, index).trim(), pair.slice(index + 1));
    }

    return jar;
}

export function cookieStorage(options: CookieStorageOptions = {}): CookieStorage {
    const { domain, maxAgeSeconds = YEAR_SECONDS } = options;

    // Set over plain HTTP the attribute makes the cookie unwritable, so it
    // follows the page rather than being declared.
    const secure = typeof location !== 'undefined' && location.protocol === 'https:';

    const attributes = [
        'Path=/',
        'SameSite=Lax',
        domain ? `Domain=${domain}` : '',
        secure  ? 'Secure' : '',
    ].filter(Boolean).join('; ');

    const write = (name: string, value: string, maxAge: number) => {
        document.cookie = `${name}=${encodeURIComponent(value)}; ${attributes}; Max-Age=${maxAge}`;
    };

    return {
        getItem(key) {
            const jar = readAll();

            // Chunks are contiguous from zero, so the first gap is the end.
            const parts: string[] = [];

            for (let index = 0; jar.has(chunkName(key, index)); index++)
                parts.push(jar.get(chunkName(key, index))!);

            if (parts.length === 0)
                return null;

            try {
                return decodeURIComponent(parts.join(''));
            }
            catch {
                // A half-written or foreign value is worse than none: returning
                // it would hand the caller something it cannot parse.
                return null;
            }
        },

        setItem(key, value) {
            const encoded = encodeURIComponent(value);

            const parts: string[] = [];

            for (let at = 0; at < encoded.length; at += CHUNK_SIZE)
                parts.push(encoded.slice(at, at + CHUNK_SIZE));

            parts.forEach((part, index) => {
                document.cookie = `${chunkName(key, index)}=${part}; ${attributes}; Max-Age=${maxAgeSeconds}`;
            });

            // A shorter value leaves the tail of a longer one behind, and those
            // stale chunks would be read back as part of the next value.
            const jar = readAll();

            for (let index = parts.length; jar.has(chunkName(key, index)); index++)
                write(chunkName(key, index), '', 0);
        },

        removeItem(key) {
            const jar = readAll();

            for (let index = 0; jar.has(chunkName(key, index)); index++)
                write(chunkName(key, index), '', 0);
        },
    };
}
