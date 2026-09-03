import { z } from "zod";
import { Foundations } from "../../Foundations";
import { Vault } from "../../Vault";
import { Workflow } from "../../Workflow";

// A self-contained snapshot of a selection. The `kind` tag lets paste ignore foreign
// clipboard text, and `version` lets the shape evolve.
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
