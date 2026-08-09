import { z } from "zod";
import { Foundations, Vault, Workflow } from "@pretzel-graph/shared/domain";

// Frontend-only clipboard contract. A self-contained snapshot of a selection,
// serialized to the system clipboard so copy/paste works across tabs/windows.
// The `kind` tag lets paste ignore foreign clipboard text, and `version` lets
// us evolve the shape later.
export const CLIPBOARD_KIND = "pretzel/workbench-clipboard" as const;
export const CLIPBOARD_VERSION = 1 as const;

const StaticValuesSchema = z.record(
    z.union([Foundations.Field.Id, Foundations.Port.Input.Id]),
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.json()])
);

export const ClipboardPayloadSchema = z.object({
    kind:    z.literal(CLIPBOARD_KIND),
    version: z.literal(CLIPBOARD_VERSION),
    nodes:   z.array(Workflow.Node.Raw.Schema),
    edges:   z.array(Workflow.Edge.Schema),
    layout:  Workflow.Layout.Schema,
    // Snapshotted at copy time so later edits to the source node don't leak in.
    staticValues:          z.record(Workflow.Node.Id, StaticValuesSchema),
    fieldExpressions:      z.record(Workflow.Node.Id, z.record(Foundations.Field.Id, z.boolean())).default({}),
    credentialInstanceIds: z.record(
        Workflow.Node.Id,
        z.record(Vault.Credential.Template.Id, Vault.Credential.Instance.Id)
    ),
});

export type ClipboardPayload = z.infer<typeof ClipboardPayloadSchema>;

export const writeClipboard = async (payload: ClipboardPayload): Promise<void> => {
    await navigator.clipboard.writeText(JSON.stringify(payload));
};

// Returns null for any non-pretzel / malformed clipboard contents so callers
// can no-op instead of throwing on arbitrary pasted text.
export const readClipboard = async (): Promise<ClipboardPayload | null> => {
    let text: string;
    try {
        text = await navigator.clipboard.readText();
    } catch {
        return null; // permission denied / not focused / unsupported
    }
    if (!text) return null;

    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch {
        return null;
    }

    const parsed = ClipboardPayloadSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
};
