// System.log levels gated by LOG_LEVEL env var (debug < info < warning < error). Default: info.

export type LogLevel = "debug" | "info" | "warning" | "error";

type Meta = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug:   10,
    info:    20,
    warning: 30,
    error:   40,
};

const COLOR: Record<LogLevel, string> = {
    debug:   "\x1b[90m", // grey
    info:    "\x1b[36m", // cyan
    warning: "\x1b[33m", // yellow
    error:   "\x1b[31m", // red
};
const RESET = "\x1b[0m";

class LogService {
    /** Explicit override via setLevel(); when null, the level is read from LOG_LEVEL. */
    private override: LogLevel | null = null;

    /** Resolved per-call so it survives dotenv loading after this module is imported. */
    private get threshold(): number {
        if (this.override) return LEVEL_ORDER[this.override];
        const envLevel = (process.env.LOG_LEVEL ?? "info").trim().toLowerCase() as LogLevel;
        return LEVEL_ORDER[envLevel] ?? LEVEL_ORDER.info;
    }

    /** Force a level at runtime, ignoring LOG_LEVEL. */
    public setLevel(level: LogLevel): void {
        this.override = level;
    }

    private write(level: LogLevel, msg: string, meta?: Meta): void {
        if (LEVEL_ORDER[level] < this.threshold) return;

        const tag  = `${COLOR[level]}[${level.toUpperCase()}]${RESET}`;
        const sink = level === "error" ? console.error : level === "warning" ? console.warn : console.log;

        if (meta && Object.keys(meta).length > 0)
            sink(`${tag} ${msg}`, meta);
        else
            sink(`${tag} ${msg}`);
    }

    public debug   = (msg: string, meta?: Meta) => this.write("debug",   msg, meta);
    public info    = (msg: string, meta?: Meta) => this.write("info",    msg, meta);
    public warning = (msg: string, meta?: Meta) => this.write("warning", msg, meta);
    public error   = (msg: string, meta?: Meta) => this.write("error",   msg, meta);
}

class SystemImpl {
    public readonly log = new LogService();
}

/** Process-wide singleton. */
export const System = new SystemImpl();
