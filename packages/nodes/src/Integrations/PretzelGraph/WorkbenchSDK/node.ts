import { RuntimeNode } from "@pretzel-graph/node-sdk";
import type { Foundations, Workflow } from "@pretzel-graph/shared/domain";

import { WorkbenchClient } from "../client";
import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    private readonly toolClients = new Map<Workflow.Id, WorkbenchClient>();

    // Reads run on a snapshot and never hold the workflow; writes run in one short hold. As a
    // tool set, the hold is opened and closed explicitly by the transaction tools.
    protected override async onRun() {
        const f  = this.fieldValues;
        const workflowId = f.workflowId as Workflow.Id;

        // A workflow can only be held once, so a refire keeps using the client that holds it.
        const heldClient = this.toolClients.get(workflowId);

        if (f.isConvertedToTool === true && heldClient?.inTransaction)
            return { tools: buildTools(heldClient) };

        const client = await WorkbenchClient.open(this.context.internalAPI, this.context.realtimeAPI, workflowId);

        if (f.isConvertedToTool === true) {
            this.toolClients.set(workflowId, client);

            return { tools: buildTools(client) };
        }

        switch (f.target) {
            case "workflow":
                switch (f.workflowOperation) {
                    case "get":  return { result: client.operations.workflow.get() };
                    case "meta": return { result: await client.getMeta() };
                }
                break;

            case "node":
                switch (f.nodeOperation) {
                    case "get":    return { result: client.operations.node.get(f.getNodeId as Workflow.Node.Id) };
                    case "delete": return { result: await client.runTransaction(() => client.operations.node.delete(f.deleteNodeId as Workflow.Node.Id)) };
                    case "create": return { result: await client.runTransaction(() => client.operations.node.create({
                        blueprintId:  f.blueprintId as Foundations.Blueprint.Id,
                        position:     { x: f.positionX, y: f.positionY },
                        staticValues: (f.staticValues ?? {}) as Record<string, unknown>,
                    })) };
                }
                break;

            case "edge":
                switch (f.edgeOperation) {
                    case "create": return { result: await client.runTransaction(() => client.operations.edge.create({
                        source:       f.sourceNodeId as Workflow.Node.Id,
                        sourceHandle: f.sourcePortId as Foundations.Port.Output.Id,
                        target:       f.targetNodeId as Workflow.Node.Id,
                        targetHandle: f.targetPortId as Foundations.Port.Input.Id,
                    })) };
                    case "delete": return { result: await client.runTransaction(() => client.operations.edge.delete(f.edgeId as Workflow.Edge.Id)) };
                }
                break;

            case "field": {
                const nodeId  = f.fieldNodeId as Workflow.Node.Id;
                const fieldId = f.fieldId as Foundations.Field.Id;

                switch (f.fieldOperation) {
                    case "get": return { result: client.operations.field.get(nodeId, fieldId) };
                    case "set": {
                        const mode = f.fieldMode === "keep" ? undefined : f.fieldMode;

                        return { result: await client.runTransaction(() => client.operations.field.set(nodeId, fieldId, f.fieldValue, mode)) };
                    }
                }
                break;
            }
        }

        throw new Error("Unsupported operation");
    }




    // Rolls back whatever transaction the tools left open.
    protected override async onWorkflowEnding() {
        const clients = [...this.toolClients.values()];

        this.toolClients.clear();

        const results = await Promise.allSettled(clients.map(async client => {
            if (client.inTransaction)
                await client.abortTransaction();
        }));

        const failures = results.filter(result => result.status === "rejected");

        if (failures.length > 0)
            throw new AggregateError(failures.map(failure => failure.reason), "Workbench transactions failed to end");
    }
}
