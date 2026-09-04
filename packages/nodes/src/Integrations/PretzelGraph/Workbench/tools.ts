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

const operation = z.discriminatedUnion("op", [
    z.object({ op: z.literal("node.create"), blueprintId, position, staticValues }),
    z.object({ op: z.literal("node.delete"), nodeId }),
    z.object({ op: z.literal("edge.create"), source: z.string(), sourceHandle: z.string(), target: z.string(), targetHandle: z.string() }),
    z.object({ op: z.literal("edge.delete"), edgeId: z.string() }),
    z.object({ op: z.literal("field.set"),   nodeId, fieldId: z.string(), value: z.unknown() }),
]);




export function buildTools(wb: WorkbenchClient) {

    // Writes open the transaction on first use and keep it until the run ends or commit is called.
    const write = async <T>(fn: () => Promise<T>): Promise<T> => {
        await wb.ensureTransaction();
        return fn();
    };


    const getWorkflow = tool(
        async () => ToolBudget.value(await wb.workflow.get()),
        {
            name:        "workbench_get_workflow",
            description: "Get the workflow's nodes, edges and validation issues. Read-only.",
            schema:      z.object({}),
        },
    );


    const getNode = tool(
        async ({ nodeId }) => ToolBudget.value(await wb.node.get(nodeId as Workflow.Node.Id)),
        {
            name:        "workbench_get_node",
            description: "Get one node: its blueprint, fields, ports, current field values and validation issues. Read-only.",
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
        getWorkflow, getNode,
        createNode, deleteNode, createEdge, deleteEdge, setField, apply,
        commit, discard,
    ];
}
