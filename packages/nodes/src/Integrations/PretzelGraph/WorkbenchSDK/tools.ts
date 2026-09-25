import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import { Foundations, Workbench, type Workflow } from "@pretzel-graph/shared/domain";
import { z } from "zod/v3";

import type { WorkbenchClient } from "../client";


const nodeId      = z.string().describe("Node id, as returned by workbench_query_nodes or workbench_create_node.");
const blueprintId = z.string().describe("Blueprint id, e.g. Core.Text.Input. The Shelf tools list and describe them.");
const position    = z.object({ x: z.number(), y: z.number() }).optional()
    .describe("Canvas position. Omit to place the node to the right of the rightmost one.");
const staticValues = z.record(z.unknown()).optional()
    .describe("Initial values keyed by base field id, or by input port id to set that port's value. Unknown keys are rejected, and so are fields marked reconcile; set those with workbench_set_field after creating.");

const edgeEndpoints = {
    sourceNodeId: z.string(),
    sourcePortId: z.string().describe("An output port id of the source node."),
    targetNodeId: z.string(),
    targetPortId: z.string().describe("An input port id of the target node."),
};

const globalFieldSpec = {
    displayName:  z.string(),
    variant:      z.enum(["String", "Boolean", "Integer", "Float"]),
    required:     z.boolean().optional(),
    tooltip:      z.string().optional(),
    initialValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
    min:          z.number().optional().describe("Integer and Float only."),
    max:          z.number().optional().describe("Integer and Float only."),
    multiline:    z.boolean().optional().describe("String only."),
};
const globalFieldPatch = z.object(globalFieldSpec).partial().extend({
    tooltip: z.string().nullable().optional().describe("Null clears it."),
    min:     z.number().nullable().optional().describe("Integer and Float only. Null clears it."),
    max:     z.number().nullable().optional().describe("Integer and Float only. Null clears it."),
});
const identifier    = z.string().regex(Workbench.ID_PATTERN, "Letters, digits and underscores only.");
const globalFieldId = identifier.describe("Global field id: letters, digits, underscores.");

const PORT_VARIANTS = Foundations.Port.Variant.options.filter(v => !Foundations.Port.isUnresolvedLike(v)) as [string, ...string[]];

const inputPort = z.object({
    id:          identifier.describe("Port id: letters, digits, underscores. Unique on the node."),
    displayName: z.string(),
    variant:     z.enum(PORT_VARIANTS).describe("The kind of data the port accepts."),
    required:    z.boolean().optional().describe("Whether a connection must be present to run."),
});

const operation = z.discriminatedUnion("op", [
    z.object({ op: z.literal("node.create"), blueprintId, position, staticValues }),
    z.object({ op: z.literal("node.delete"), nodeId }),
    z.object({ op: z.literal("node.move"),   nodeId, position: z.object({ x: z.number(), y: z.number() }) }),
    z.object({ op: z.literal("node.addInputPort"),    nodeId, port: inputPort }),
    z.object({ op: z.literal("node.removeInputPort"), nodeId, portId: z.string() }),
    z.object({ op: z.literal("node.updateInputPort"), nodeId, portId: z.string(), port: inputPort }),
    z.object({ op: z.literal("edge.create"), ...edgeEndpoints }),
    z.object({ op: z.literal("edge.delete"), edgeId: z.string() }),
    z.object({ op: z.literal("field.set"),   nodeId, fieldId: z.string(), value: z.unknown() }),
    z.object({ op: z.literal("globalField.add"),    id: globalFieldId, ...globalFieldSpec }),
    z.object({ op: z.literal("globalField.update"), fieldId: globalFieldId, patch: globalFieldPatch }),
    z.object({ op: z.literal("globalField.remove"), fieldId: globalFieldId }),
]);

const toConnection = (edge: z.infer<z.ZodObject<typeof edgeEndpoints>>): Workbench.Document.DriverConnection => ({
    source:       edge.sourceNodeId as Workflow.Node.Id,
    sourceHandle: edge.sourcePortId as Foundations.Port.Output.Id,
    target:       edge.targetNodeId as Workflow.Node.Id,
    targetHandle: edge.targetPortId as Foundations.Port.Input.Id,
});

const READ_NOTE = "Reads show the saved graph plus this run's edits. The first edit in a run reloads the saved graph, so ids read before it can be gone if the workflow was saved elsewhere in between.";
const LOCK_NOTE = "The first edit in a run holds the workflow until workbench_commit, workbench_discard or the end of the run; no one else can save it meanwhile, and the edit fails if someone else already holds it.";


export function buildTools(client: WorkbenchClient) {

    // Writes open the transaction on first use and keep it until the run ends or commit is called.
    const write = async <T>(fn: () => T | Promise<T>): Promise<T> => {
        await client.ensureTransaction();
        return fn();
    };


    const nodeIds = z.array(z.string()).optional();

    const queryNodes = tool(
        async (query) => {
            const { items, total } = client.operations.workflow.queryNodes(query as never);

            return ToolBudget.list("nodes", items, { hint: total > items.length ? `${total} matched; ${items.length} returned. Narrow the query or raise limit.` : undefined });
        },
        {
            name:        "workbench_query_nodes",
            description: `Find nodes. Filters combine; omit all to list every node. Returns id, blueprint, display name, disabled flag and whether the node has validation issues; use workbench_get_node for detail. Read-only. ${READ_NOTE}`,
            schema: z.object({
                ids:          nodeIds.describe("Only these node ids."),
                blueprintIds: z.array(z.string()).optional().describe("Only nodes of these blueprints."),
                displayName:  z.string().optional().describe("Case-insensitive substring of the display name."),
                upstreamOf:   nodeIds.describe("Only nodes that feed directly into any of these nodes."),
                downstreamOf: nodeIds.describe("Only nodes fed directly by any of these nodes."),
                limit:        z.number().int().positive().max(500).optional().describe("Default 50."),
            }),
        },
    );


    const queryEdges = tool(
        async (query) => {
            const { items, total } = client.operations.workflow.queryEdges(query as never);

            return ToolBudget.list("edges", items, { hint: total > items.length ? `${total} matched; ${items.length} returned. Narrow the query or raise limit.` : undefined });
        },
        {
            name:        "workbench_query_edges",
            description: "Find edges. Filters combine; omit all to list every edge. Each edge has an id and its source and target node and port. Read-only.",
            schema: z.object({
                nodeIds:       nodeIds.describe("Edges touching any of these nodes at either end."),
                sourceNodeIds: nodeIds.describe("Edges leaving any of these nodes."),
                targetNodeIds: nodeIds.describe("Edges entering any of these nodes."),
                limit:         z.number().int().positive().max(500).optional().describe("Default 50."),
            }),
        },
    );


    const getMeta = tool(
        async () => ToolBudget.value(await client.getMeta()),
        {
            name:        "workbench_get_workflow_meta",
            description: "Get the workflow's name, description, icon, folder, lock state and timestamps. Not its graph. Read-only.",
            schema:      z.object({}),
        },
    );


    const getLayout = tool(
        async () => ToolBudget.value(client.operations.workflow.layout()),
        {
            name:        "workbench_get_layout",
            description: "Get every node's canvas position and estimated size, plus the bounding box of the whole graph. Use it to place or move nodes without overlap. Read-only.",
            schema:      z.object({}),
        },
    );


    const getNode = tool(
        async ({ nodeId }) => ToolBudget.value(client.operations.node.get(nodeId as Workflow.Node.Id)),
        {
            name:        "workbench_get_node",
            description: `Get one node: its blueprint, fields, ports, current field values and validation issues, and for each port the edges on it with the node and port at their other end. Read-only. ${READ_NOTE}`,
            schema:      z.object({ nodeId }),
        },
    );


    const createNode = tool(
        async ({ blueprintId, position, staticValues }) => ToolBudget.value(
            await write(() => client.operations.node.create({
                blueprintId: blueprintId as Foundations.Blueprint.Id,
                position,
                staticValues,
            })),
        ),
        {
            name:        "workbench_create_node",
            description: `Add a node on its base branch. Returns its id and any validation issues. Reshape it afterwards with workbench_set_field on a reconcile field. ${LOCK_NOTE}`,
            schema:      z.object({ blueprintId, position, staticValues }),
        },
    );


    const deleteNode = tool(
        async ({ nodeId }) => ToolBudget.value(await write(() => client.operations.node.delete(nodeId as Workflow.Node.Id))),
        {
            name:        "workbench_delete_node",
            description: "Remove a node and every edge connected to it.",
            schema:      z.object({ nodeId }),
        },
    );


    const moveNode = tool(
        async ({ nodeId, position }) => ToolBudget.value(
            await write(() => client.operations.node.move(nodeId as Workflow.Node.Id, position)),
        ),
        {
            name:        "workbench_move_node",
            description: "Move a node to a canvas position. Layout only; nothing else about the node changes.",
            schema:      z.object({ nodeId, position: z.object({ x: z.number(), y: z.number() }) }),
        },
    );


    const addInputPort = tool(
        async ({ nodeId, port }) => ToolBudget.value(
            await write(() => client.operations.node.input.addPort(nodeId as Workflow.Node.Id, port as never)),
        ),
        {
            name:        "workbench_add_input_port",
            description: "Add an input port to a node beyond what its blueprint declares, so an edge can bring extra data in. Not for sub-workflow nodes, whose ports come from the sub-workflow.",
            schema:      z.object({ nodeId, port: inputPort }),
        },
    );


    const removeInputPort = tool(
        async ({ nodeId, portId }) => ToolBudget.value(
            await write(() => client.operations.node.input.removePort(nodeId as Workflow.Node.Id, portId as Foundations.Port.Input.Id)),
        ),
        {
            name:        "workbench_remove_input_port",
            description: "Remove an input port that was added to a node, along with any edge into it. Blueprint ports cannot be removed.",
            schema:      z.object({ nodeId, portId: z.string() }),
        },
    );


    const updateInputPort = tool(
        async ({ nodeId, portId, port }) => ToolBudget.value(
            await write(() => client.operations.node.input.updatePort(nodeId as Workflow.Node.Id, portId as Foundations.Port.Input.Id, port as never)),
        ),
        {
            name:        "workbench_update_input_port",
            description: "Replace an added input port's id, name, kind or required flag. Blueprint ports cannot be edited.",
            schema:      z.object({ nodeId, portId: z.string().describe("The added port to change."), port: inputPort }),
        },
    );


    const createEdge = tool(
        async (edge) => ToolBudget.value(await write(() => client.operations.edge.create(toConnection(edge)))),
        {
            name:        "workbench_create_edge",
            description: "Connect an output port of one node to an input port of another. Fails, with the reason, wherever the editor would refuse the same connection, such as mismatched port kinds.",
            schema:      z.object(edgeEndpoints),
        },
    );


    const deleteEdge = tool(
        async ({ edgeId }) => ToolBudget.value(await write(() => client.operations.edge.delete(edgeId as Workflow.Edge.Id))),
        {
            name:        "workbench_delete_edge",
            description: "Remove an edge by id.",
            schema:      z.object({ edgeId: z.string() }),
        },
    );


    const setField = tool(
        async ({ nodeId, fieldId, value }) => ToolBudget.value(
            await write(() => client.operations.field.set(nodeId as Workflow.Node.Id, fieldId as Foundations.Field.Id, value)),
        ),
        {
            name:        "workbench_set_field",
            description: `Set a field value on a node. If the field reshapes the node, the result lists the ports added and removed and the edges dropped. ${LOCK_NOTE}`,
            schema:      z.object({ nodeId, fieldId: z.string(), value: z.unknown() }),
        },
    );


    const listGlobalFields = tool(
        async () => ToolBudget.list("fields", client.operations.globalField.list()),
        {
            name:        "workbench_list_global_fields",
            description: "List the workflow's global fields: the inputs it exposes when used as a sub-workflow node, read inside it as $globalFields.<id>. Read-only.",
            schema:      z.object({}),
        },
    );


    const addGlobalField = tool(
        async ({ id, ...spec }) => ToolBudget.value(
            await write(() => client.operations.globalField.add({ id: id as Foundations.Field.Id, ...spec })),
        ),
        {
            name:        "workbench_add_global_field",
            description: "Add a global field to the workflow. String, Boolean, Integer or Float.",
            schema:      z.object({ id: globalFieldId, ...globalFieldSpec }),
        },
    );


    const updateGlobalField = tool(
        async ({ fieldId, patch }) => ToolBudget.value(
            await write(() => client.operations.globalField.update(fieldId as Foundations.Field.Id, patch)),
        ),
        {
            name:        "workbench_update_global_field",
            description: "Change a global field's name, kind, default or limits. Only the given properties change; null clears tooltip, min or max. Changing the kind resets the default, limits and multiline to the new kind's unless the patch sets them.",
            schema:      z.object({ fieldId: globalFieldId, patch: globalFieldPatch }),
        },
    );


    const removeGlobalField = tool(
        async ({ fieldId }) => ToolBudget.value(await write(() => client.operations.globalField.remove(fieldId as Foundations.Field.Id))),
        {
            name:        "workbench_remove_global_field",
            description: "Remove a global field from the workflow.",
            schema:      z.object({ fieldId: globalFieldId }),
        },
    );


    const apply = tool(
        async ({ operations }) => {
            const mapped = operations.map(op => op.op === "edge.create" ? { op: op.op, ...toConnection(op) } : op);

            return ToolBudget.value(await write(() => client.operations.batch(mapped as Workbench.Operation[])));
        },
        {
            name:        "workbench_apply",
            description: `Apply several operations in order in one call. Stops at the first failure; earlier operations stay applied and their results are returned, with the failure under failed. ${LOCK_NOTE}`,
            schema:      z.object({ operations: z.array(operation).min(1) }),
        },
    );


    const commit = tool(
        async () => {
            if (!client.inTransaction)
                return "Nothing to save.";

            await client.commitTransaction();
            return "Saved.";
        },
        {
            name:        "workbench_commit",
            description: "Save every change made so far and release the workflow. Unsaved changes are saved automatically if the run completes and discarded if it fails or is stopped; call this to make them permanent now. The next edit holds the workflow again.",
            schema:      z.object({}),
        },
    );


    const discard = tool(
        async () => {
            if (!client.inTransaction)
                return "Nothing to discard.";

            await client.abortTransaction();
            return "Discarded.";
        },
        {
            name:        "workbench_discard",
            description: "Throw away every change since the last save and release the workflow. Reads go back to the saved graph.",
            schema:      z.object({}),
        },
    );


    return [
        getMeta, queryNodes, queryEdges, getNode, getLayout,
        createNode, deleteNode, moveNode, addInputPort, updateInputPort, removeInputPort, createEdge, deleteEdge, setField,
        listGlobalFields, addGlobalField, updateGlobalField, removeGlobalField,
        apply, commit, discard,
    ];
}
