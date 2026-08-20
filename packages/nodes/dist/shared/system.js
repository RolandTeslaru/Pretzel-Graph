"use strict";
// System.log levels gated by LOG_LEVEL env var (debug < info < warning < error). Default: info.
Object.defineProperty(exports, "__esModule", { value: true });
exports.System = void 0;
const LEVEL_ORDER = {
    debug: 10,
    info: 20,
    warning: 30,
    error: 40,
};
const COLOR = {
    debug: "\x1b[90m", // grey
    info: "\x1b[36m", // cyan
    warning: "\x1b[33m", // yellow
    error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";
class LogService {
    /** Explicit override via setLevel(); when null, the level is read from LOG_LEVEL. */
    override = null;
    /** Resolved per-call so it survives dotenv loading after this module is imported. */
    get threshold() {
        if (this.override)
            return LEVEL_ORDER[this.override];
        const envLevel = (process.env.LOG_LEVEL ?? "info").trim().toLowerCase();
        return LEVEL_ORDER[envLevel] ?? LEVEL_ORDER.info;
    }
    /** Force a level at runtime, ignoring LOG_LEVEL. */
    setLevel(level) {
        this.override = level;
    }
    write(level, msg, meta) {
        if (LEVEL_ORDER[level] < this.threshold)
            return;
        const tag = `${COLOR[level]}[${level.toUpperCase()}]${RESET}`;
        const sink = level === "error" ? console.error : level === "warning" ? console.warn : console.log;
        if (meta && Object.keys(meta).length > 0)
            sink(`${tag} ${msg}`, meta);
        else
            sink(`${tag} ${msg}`);
    }
    debug = (msg, meta) => this.write("debug", msg, meta);
    info = (msg, meta) => this.write("info", msg, meta);
    warning = (msg, meta) => this.write("warning", msg, meta);
    error = (msg, meta) => this.write("error", msg, meta);
}
class SystemImpl {
    log = new LogService();
}
/** Process-wide singleton. */
exports.System = new SystemImpl();
