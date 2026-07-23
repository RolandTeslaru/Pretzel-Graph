import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

const BODYLESS_METHODS = ["GET", "HEAD"];

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        _incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { method, url, headers, body } = this.fieldValues;

        // validateStatus keeps the fetch contract this node had: a 404 is a result with a
        // status, not a thrown error. Transport failures still throw and are caught below.
        const client = this.httpClientFactory.create({
            vendor: "HTTP Request",
            validateStatus: () => true,
        });

        const requestHeaders = { ...(headers as Record<string, string>) };
        const sendsBody = !BODYLESS_METHODS.includes(method);

        if (sendsBody && !Object.keys(requestHeaders).some(h => h.toLowerCase() === "content-type"))
            requestHeaders["Content-Type"] = "application/json";

        try {
            const response = await client.raw.request({
                method,
                url,
                headers: requestHeaders,
                ...(sendsBody && { data: body }),
            });

            return {
                result: {
                    status: response.status,
                    data: response.data ?? null,
                },
            };
        }
        catch (error) {
            // Only transport-level failures reach here — DNS, refused, timeout, aborted.
            // status 0 distinguishes "never got a response" from a real server error.
            return {
                result: {
                    status: 0,
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
}
