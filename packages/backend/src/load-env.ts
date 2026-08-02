import dotenv from 'dotenv';
import path from 'path';

// Imported for its side effect as the FIRST import in main.ts.
//
// Import side effects run before the rest of the module graph is evaluated, so
// modules that read process.env at import time — utils/supabase.ts captures
// SUPABASE_URL and SUPABASE_ANON_KEY into module-level consts — see the values.
//
// Previously main.ts called dotenv.config() *after* its own imports, which was
// too late: utils/supabase.ts had already run its own bare dotenv.config(),
// which resolves against process.cwd() and therefore loaded
// packages/backend/.env rather than the repo-root .env. That per-package file
// has since been consolidated into the root one.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
