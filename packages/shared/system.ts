// System.log levels gated by LOG_LEVEL env var (debug < info < warning < error). Default: info.
// Lines read: [App] <timestamp> <LEVEL> [Context] message { meta } +Nms
// Set LOG_TIMESTAMPS=false where the log sink stamps lines itself.

export type LogLevel = "debug" | "info" | "warning" | "error";

type Meta = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug:   10,
    info:    20,
    warning: 30,
    error:   40,
};

const COLOR: Record<LogLevel, string> = {
    debug:   "\x1b[35m", // magenta
    info:    "\x1b[32m", // green
    warning: "\x1b[33m", // yellow
    error:   "\x1b[31m", // red
};

const APP_COLOR     = "\x1b[32m"; // green
const CONTEXT_COLOR = "\x1b[33m"; // yellow
const DIM           = "\x1b[2m";
const RESET         = "\x1b[0m";

// Widest level name, so the message column lines up across levels.
const LEVEL_WIDTH = 7;

export interface Log {
    debug:   (msg: string, meta?: Meta) => void;
    info:    (msg: string, meta?: Meta) => void;
    warning: (msg: string, meta?: Meta) => void;
    error:   (msg: string, meta?: Meta) => void;
}

class LogService implements Log {
    /** Explicit override via setLevel(); when null, the level is read from LOG_LEVEL. */
    private override: LogLevel | null = null;

    /** Set by the process at boot; LOG_APP_NAME overrides it for a deployment. */
    private appName = "App";

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

    /** Names the process in every line's prefix, e.g. "Worker". */
    public setAppName(name: string): void {
        this.appName = name;
    }

    private get app(): string {
        return process.env.LOG_APP_NAME?.trim() || this.appName;
    }

    /** A logger tagged with a service name, the way Nest tags its own. */
    public withContext(context: string): Log {
        return {
            debug:   (msg, meta) => this.write("debug",   msg, meta, context),
            info:    (msg, meta) => this.write("info",    msg, meta, context),
            warning: (msg, meta) => this.write("warning", msg, meta, context),
            error:   (msg, meta) => this.write("error",   msg, meta, context),
        };
    }

    private write(level: LogLevel, msg: string, meta?: Meta, context?: string): void {
        if (LEVEL_ORDER[level] < this.threshold) return;

        const color = COLOR[level];

        const app   = `${APP_COLOR}[${this.app}]${RESET}`;
        const stamp = process.env.LOG_TIMESTAMPS === "false"
            ? ""
            : `${DIM}${new Date().toISOString()}${RESET} `;

        const tag   = `${color}${level.toUpperCase().padStart(LEVEL_WIDTH)}${RESET}`;
        const scope = context ? ` ${CONTEXT_COLOR}[${context}]${RESET}` : "";

        // `ms` renders as Nest's trailing duration rather than another meta key.
        const { ms, ...rest } = meta ?? {};
        const duration = typeof ms === "number" ? `${CONTEXT_COLOR}+${Math.round(ms)}ms${RESET}` : "";

        const head = `${app} ${stamp}${tag}${scope} ${color}${msg}${RESET}`;
        const sink = level === "error" ? console.error : level === "warning" ? console.warn : console.log;

        const hasMeta = Object.keys(rest).length > 0;

        if (hasMeta && duration)
            sink(head, rest, duration);
        else if (hasMeta)
            sink(head, rest);
        else if (duration)
            sink(`${head} ${duration}`);
        else
            sink(head);
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
