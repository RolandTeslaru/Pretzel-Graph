import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import type { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { z } from "zod/v3";

import type { WorkbenchClient } from "../client";


const nodeId      = z.string().describe("Node id, as returned by get_workflow or create_node.");
const blueprintId = z.string().describe("Blueprint id, e.g. Core.Text.Input. The Shelf tools list and describe them.");
const position    = z.object({ x: z.number(), y: z.number() }).optional()
    .describe("Canvas position. Omit to place the node to the right of the rightmost one.");
const staticValues = z.record(z.unknown()).optional()
    .describe("Initial field values keyed by field id.");

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
const globalFieldId = z.string().describe("Global field id: letters, digits, underscores.");

const operation = z.discriminatedUnion("op", [
    z.object({ op: z.literal("node.create"), blueprintId, position, staticValues }),
    z.object({ op: z.literal("node.delete"), nodeId }),
    z.object({ op: z.literal("node.move"),   nodeId, position: z.object({ x: z.number(), y: z.number() }) }),
    z.object({ op: z.literal("edge.create"), source: z.string(), sourceHandle: z.string(), target: z.string(), targetHandle: z.string() }),
    z.object({ op: z.literal("edge.delete"), edgeId: z.string() }),
    z.object({ op: z.literal("field.set"),   nodeId, fieldId: z.string(), value: z.unknown() }),
    z.object({ op: z.literal("globalField.add"),    id: globalFieldId, ...globalFieldSpec }),
    z.object({ op: z.literal("globalField.update"), fieldId: globalFieldId, patch: z.object(globalFieldSpec).partial() }),
    z.object({ op: z.literal("globalField.remove"), fieldId: globalFieldId }),
]);




export function buildTools(wb: WorkbenchClient) {

    // Writes open the transaction on first use and keep it until the run ends or commit is called.
    const write = async <T>(fn: () => Promise<T>): Promise<T> => {
        await wb.ensureTransaction();
        return fn();
    };


    const nodeIds = z.array(z.string()).optional();

    const queryNodes = tool(
        async (query) => {
            const { items, total } = await wb.workflow.queryNodes(query as never);

            return ToolBudget.list("nodes", items, { hint: total > items.length ? `${total} matched; ${items.length} returned. Narrow the query or raise limit.` : undefined });
        },
        {
            name:        "workbench_query_nodes",
            description: "Find nodes. Filters combine; omit all to list every node. Returns id, blueprint, display name, disabled flag and whether the node has validation issues; use get_node for detail. Read-only.",
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
            const { items, total } = await wb.workflow.queryEdges(query as never);

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
        async () => ToolBudget.value(await wb.workflow.getMeta()),
        {
            name:        "workbench_get_workflow_meta",
            description: "Get the workflow's name, description, icon, folder, lock state and timestamps. Not its graph. Read-only.",
            schema:      z.object({}),
        },
    );


    const getLayout = tool(
        async () => ToolBudget.value(await wb.workflow.layout()),
        {
            name:        "workbench_get_layout",
            description: "Get every node's canvas position and estimated size, plus the bounding box of the whole graph. Use it to place or move nodes without overlap. Read-only.",
            schema:      z.object({}),
        },
    );


    const getNode = tool(
        async ({ nodeId }) => ToolBudget.value(await wb.node.get(nodeId as Workflow.Node.Id)),
        {
            name:        "workbench_get_node",
            description: "Get one node: its blueprint, fields, ports, current field values, the edges on each port, and validation issues. Read-only.",
            schema:      z.object({ nodeId }),
        },
    );


    const createNode = tool(
        async ({ blueprintId, position, staticValues }) => ToolBudget.value(
            await write(() => wb.node.create({
                blueprintId: blueprintId as Foundations.Blueprint.Id,
                position,
                staticValues,
            })),
        ),
        {
            name:        "workbench_create_node",
            description: "Add a node to the workflow. Returns its id and any validation issues.",
            schema:      z.object({ blueprintId, position, staticValues }),
        },
    );


    const deleteNode = tool(
        async ({ nodeId }) => ToolBudget.value(await write(() => wb.node.delete(nodeId as Workflow.Node.Id))),
        {
            name:        "workbench_delete_node",
            description: "Remove a node and every edge connected to it.",
            schema:      z.object({ nodeId }),
        },
    );


    const moveNode = tool(
        async ({ nodeId, position }) => ToolBudget.value(
            await write(() => wb.node.move(nodeId as Workflow.Node.Id, position)),
        ),
        {
            name:        "workbench_move_node",
            description: "Move a node to a canvas position. Layout only; nothing else about the node changes.",
            schema:      z.object({ nodeId, position: z.object({ x: z.number(), y: z.number() }) }),
        },
    );


    const createEdge = tool(
        async ({ sourceNodeId, sourcePortId, targetNodeId, targetPortId }) => ToolBudget.value(
            await write(() => wb.edge.create({
                source:       sourceNodeId as Workflow.Node.Id,
                sourceHandle: sourcePortId as Foundations.Port.Output.Id,
                target:       targetNodeId as Workflow.Node.Id,
                targetHandle: targetPortId as Foundations.Port.Input.Id,
            })),
        ),
        {
            name:        "workbench_create_edge",
            description: "Connect an output port of one node to an input port of another. Fails if the port types do not match.",
            schema:      z.object(edgeEndpoints),
        },
    );


    const deleteEdge = tool(
        async ({ edgeId }) => ToolBudget.value(await write(() => wb.edge.delete(edgeId as Workflow.Edge.Id))),
        {
            name:        "workbench_delete_edge",
            description: "Remove an edge by id.",
            schema:      z.object({ edgeId: z.string() }),
        },
    );


    const setField = tool(
        async ({ nodeId, fieldId, value }) => ToolBudget.value(
            await write(() => wb.field.set(nodeId as Workflow.Node.Id, fieldId as Foundations.Field.Id, value)),
        ),
        {
            name:        "workbench_set_field",
            description: "Set a field value on a node. If the field reshapes the node, the result lists the ports added and removed and the edges dropped.",
            schema:      z.object({ nodeId, fieldId: z.string(), value: z.unknown() }),
        },
    );


    const listGlobalFields = tool(
        async () => ToolBudget.list("fields", await wb.globalField.list()),
        {
            name:        "workbench_list_global_fields",
            description: "List the workflow's global fields: the inputs it exposes when used as a sub-workflow node, read inside it as $globalFields.<id>. Read-only.",
            schema:      z.object({}),
        },
    );


    const addGlobalField = tool(
        async ({ id, ...spec }) => ToolBudget.value(
            await write(() => wb.globalField.add({ id: id as Foundations.Field.Id, ...spec })),
        ),
        {
            name:        "workbench_add_global_field",
            description: "Add a global field to the workflow. String, Boolean, Integer or Float.",
            schema:      z.object({ id: globalFieldId, ...globalFieldSpec }),
        },
    );


    const updateGlobalField = tool(
        async ({ fieldId, patch }) => ToolBudget.value(
            await write(() => wb.globalField.update(fieldId as Foundations.Field.Id, patch)),
        ),
        {
            name:        "workbench_update_global_field",
            description: "Change a global field's name, kind, default or limits. Only the given properties change.",
            schema:      z.object({ fieldId: globalFieldId, patch: z.object(globalFieldSpec).partial() }),
        },
    );


    const removeGlobalField = tool(
        async ({ fieldId }) => ToolBudget.value(await write(() => wb.globalField.remove(fieldId as Foundations.Field.Id))),
        {
            name:        "workbench_remove_global_field",
            description: "Remove a global field from the workflow.",
            schema:      z.object({ fieldId: globalFieldId }),
        },
    );


    const apply = tool(
        async ({ operations }) => ToolBudget.value(await write(() => wb.batch(operations as never))),
        {
            name:        "workbench_apply",
            description: "Apply several operations in order in one call. Stops at the first failure; earlier operations stay applied.",
            schema:      z.object({ operations: z.array(operation).min(1) }),
        },
    );


    const commit = tool(
        async () => {
            if (!wb.inTransaction)
                return "Nothing to save.";

            await wb.commitTransaction();
            return "Saved.";
        },
        {
            name:        "workbench_commit",
            description: "Save every change made so far. Changes are also saved automatically when the run completes; call this to save earlier.",
            schema:      z.object({}),
        },
    );


    const discard = tool(
        async () => {
            if (!wb.inTransaction)
                return "Nothing to discard.";

            await wb.abortTransaction();
            return "Discarded.";
        },
        {
            name:        "workbench_discard",
            description: "Throw away every unsaved change since the last save.",
            schema:      z.object({}),
        },
    );


    return [
        getMeta, queryNodes, queryEdges, getNode, getLayout,
        createNode, deleteNode, moveNode, createEdge, deleteEdge, setField,
        listGlobalFields, addGlobalField, updateGlobalField, removeGlobalField,
        apply, commit, discard,
    ];
}
