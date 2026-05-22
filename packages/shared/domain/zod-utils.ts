import { z } from 'zod';

// Supabase returns timestamps in non-standard format:
// "2026-05-22 13:47:12.123456+00" (space instead of T, offset missing :MM)
// This preprocesses to ISO 8601 before Zod validates.
export const supabaseTimestamp = z.preprocess(
    (v) => {
        if (typeof v !== 'string') return v;
        return v.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
    },
    z.iso.datetime({ offset: true }),
);
