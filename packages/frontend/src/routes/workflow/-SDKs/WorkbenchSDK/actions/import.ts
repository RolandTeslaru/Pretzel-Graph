import { Workflow } from "@pretzel-graph/shared/domain";
import { toast } from "sonner";
import { VaultSDK } from "@/SDKs/VaultSDK/sdk";
import {
    type ClipboardPayload,
    CLIPBOARD_KIND,
    CLIPBOARD_VERSION,
    ClipboardPayloadSchema,
} from "../clipboard/payload";
import { insertPayload } from "./clipboard";
import { withAsyncCommit } from "../utils/actions";

type ImportedGraph = {
    payload: ClipboardPayload;
    dependencies?: Workflow.Data["dependencies"];
};

// Opens the OS file picker and resolves with the chosen file's text, or null if dismissed.
const pickJsonFile = (): Promise<string | null> => {
    return new Promise(resolve => {
        const input = window.document.createElement("input");

        input.type = "file";
        input.accept = "application/json,.json";
        input.style.display = "none";

        const finish = async (file?: File) => {
            input.remove();
            resolve(file ? await file.text() : null);
        };

        input.onchange = () => finish(input.files?.[0]);
        input.oncancel = () => finish();

        window.document.body.appendChild(input);
        input.click();
    });
};

// Credential ids are deployment-scoped, so an import keeps only the ones this vault holds.
const keepLocalCredentials = (
    byNode: Workflow.Data["credentialInstanceIds"],
): Workflow.Data["credentialInstanceIds"] => {
    const vault = VaultSDK.state.credentialInstances;
    const kept: Workflow.Data["credentialInstanceIds"] = {};

    for (const [nodeId, assignments] of Object.entries(byNode)) {
        const local = Object.entries(assignments).filter(([, instanceId]) => instanceId in vault);

        if (local.length > 0)
            kept[nodeId as Workflow.Node.Id] = Object.fromEntries(local) as typeof assignments;
    }

    return kept;
};

// Accepts an exported workflow file, a bare workflow `data` blob, or a copied clipboard payload,
// and reshapes it into the payload the paste path consumes. Older blobs migrate on parse.
const readGraph = (raw: unknown): ImportedGraph | null => {
    const clipboard = ClipboardPayloadSchema.safeParse(raw);
    if (clipboard.success)
        return { payload: clipboard.data };

    const source = raw && typeof raw === "object" && "data" in raw
        ? (raw as { data: unknown }).data
        : raw;

    const parsed = Workflow.Data.Schema.safeParse(source);
    if (!parsed.success) return null;

    const data = parsed.data;

    return {
        payload: {
            kind:                  CLIPBOARD_KIND,
            version:               CLIPBOARD_VERSION,
            nodes:                 Object.values(data.nodes),
            edges:                 data.edges.map(Workflow.Edge.fromId),
            layout:                data.ui.layout,
            staticValues:          data.staticValues,
            fieldExpressions:      data.fieldExpressions,
            credentialInstanceIds: keepLocalCredentials(data.credentialInstanceIds),
        },
        dependencies: data.dependencies,
    };
};

export const importActions = {
    fromFile: withAsyncCommit(async (position?: { x: number, y: number }): Promise<void> => {
        const text = await pickJsonFile();
        if (!text) return;

        let raw: unknown;

        try {
            raw = JSON.parse(text);
        } catch {
            toast.error("That file is not valid JSON");
            return;
        }

        const graph = readGraph(raw);

        if (!graph) {
            toast.error("That file is not a workflow export");
            return;
        }

        if (graph.payload.nodes.length === 0) {
            toast.error("That workflow has no nodes");
            return;
        }

        await insertPayload(graph.payload, position, graph.dependencies);

        toast.success(`Imported ${graph.payload.nodes.length} nodes`);
    }),
};

export type ImportActions = typeof importActions;
