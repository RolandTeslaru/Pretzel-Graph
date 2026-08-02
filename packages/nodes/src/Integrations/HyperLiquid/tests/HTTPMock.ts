import type { HTTP } from "@pretzel-graph/node-sdk";


export type InfoCall = {
    path:    string;
    payload: Record<string, unknown>;
};

type Responder = unknown | ((payload: Record<string, unknown>) => unknown | Promise<unknown>);


export class HTTPMock {
    public readonly calls: InfoCall[] = [];
    public config: HTTP.Client.Config | undefined;

    readonly #responses: ReadonlyMap<string, Responder>;

    constructor(responses: Record<string, Responder>) {
        this.#responses = new Map(Object.entries(responses));
    }

    public readonly api: HTTP.ClientAPI = {
        create: config => {
            this.config = config;

            return {
                raw: {} as HTTP.Client["raw"],
                get: async () => { throw new Error("Unexpected GET"); },
                put: async () => { throw new Error("Unexpected PUT"); },
                patch: async () => { throw new Error("Unexpected PATCH"); },
                delete: async () => { throw new Error("Unexpected DELETE"); },
                post: async <T>(path: string, data?: unknown) => {
                    const payload = data as Record<string, unknown>;
                    const type = String(payload.type ?? "");
                    const responder = this.#responses.get(type);

                    this.calls.push({ path, payload });

                    if (responder === undefined)
                        throw new Error(`No response configured for info type '${type}'`);

                    const value = typeof responder === "function"
                        ? await responder(payload)
                        : responder;

                    return value as T;
                },
            };
        },
    };
}
