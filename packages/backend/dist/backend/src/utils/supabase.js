"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserId = exports.createAuthenticatedClient = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
}
// Context-aware client (User context)
const createAuthenticatedClient = (accessToken) => {
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
};
exports.createAuthenticatedClient = createAuthenticatedClient;
const getUserId = async (supabase) => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
};
exports.getUserId = getUserId;
