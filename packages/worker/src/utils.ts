export const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUUID(value: string): boolean {
    return UUID_REGEX.test(value)
}

// Resolves with 'timeout' when the work outlasts `ms`.
export const bounded = async <T>(work: Promise<T>, ms: number): Promise<T | 'timeout'> => {
    let timer: NodeJS.Timeout | undefined;

    const timeout = new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), ms);
    });

    try {
        return await Promise.race([work, timeout]);
    }
    finally {
        clearTimeout(timer);
    }
};
