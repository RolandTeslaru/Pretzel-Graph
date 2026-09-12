import { RuntimeNode } from "@pretzel-graph/node-sdk";
import type { Foundations, Workflow } from "@pretzel-graph/shared/domain";

import { WorkbenchClient } from "../client";
import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    // Reads run on a snapshot and never hold the workflow; writes run in one short hold. As a
    // tool set, the first write opens one hold that lasts until the run ends or a tool commits.
    protected override async onRun() {
        const f  = this.fieldValues;
        const client = await WorkbenchClient.open(this.context.internalAPI, this.context.realtimeAPI, f.workflowId as Workflow.Id);

        if (f.isConvertedToTool === true) {
            this.context.lifecycleAPI.onEnding(async outcome => {
                if (!client.inTransaction)
                    return;

                if (outcome === "completed")
                    await client.commitTransaction();
                else
                    await client.abortTransaction();
            });

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
                    case "set": return { result: await client.runTransaction(() => client.operations.field.set(nodeId, fieldId, f.fieldValue)) };
                }
                break;
            }
        }

        throw new Error("Unsupported operation");
    }
}
