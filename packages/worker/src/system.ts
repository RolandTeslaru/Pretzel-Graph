/**
 * System — process-wide singleton for cross-cutting concerns in the worker.
 *
 * Currently exposes `System.log` with level methods:
 *
 *   System.log.info("node fired", { nodeId, blueprint })
 *   System.log.warning("swallowed node error", { nodeId })
 *   System.log.error("execution failed", { executionId, err })
 *
 * Output goes to the worker's stdout/stderr. The active level is controlled by
 * the LOG_LEVEL env var (debug < info < warning < error); messages below the
 * threshold are dropped cheaply. Default level is "info".
 */

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
    private threshold: number;

    constructor() {
        const envLevel = (process.env.LOG_LEVEL ?? "info").trim().toLowerCase() as LogLevel;
        this.threshold = LEVEL_ORDER[envLevel] ?? LEVEL_ORDER.info;
    }

    /** Change the active level at runtime. */
    public setLevel(level: LogLevel): void {
        this.threshold = LEVEL_ORDER[level];
    }

    private write(level: LogLevel, msg: string, meta?: Meta): void {
        if (LEVEL_ORDER[level] < this.threshold) return;

        const tag  = `${COLOR[level]}[${level.toUpperCase()}]${RESET}`;
        const time = new Date().toISOString();
        const sink = level === "error" ? console.error : level === "warning" ? console.warn : console.log;

        if (meta && Object.keys(meta).length > 0)
            sink(`${tag} ${time} ${msg}`, meta);
        else
            sink(`${tag} ${time} ${msg}`);
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
