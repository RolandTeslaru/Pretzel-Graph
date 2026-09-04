import { RuntimeNode, type InferOutputs } from "@pretzel-graph/node-sdk";
import type { Foundations, Workflow } from "@pretzel-graph/shared/domain";

import { WorkbenchClient } from "../client";
import { Blueprint } from "./blueprint";


export class Node extends RuntimeNode<typeof Blueprint> {

    // Reads run on a snapshot and never hold the workflow; writes run in one short hold.
    protected override async onRun(): Promise<InferOutputs<typeof Blueprint>> {
        const f  = this.fieldValues;
        const wb = new WorkbenchClient(this.context.internalAPI, f.workflowId as Workflow.Id);

        switch (f.target) {
            case "workflow":
                return { result: await wb.workflow.get() };

            case "node":
                switch (f.nodeOperation) {
                    case "get":    return { result: await wb.node.get(f.getNodeId as Workflow.Node.Id) };
                    case "delete": return { result: await wb.write(() => wb.node.delete(f.deleteNodeId as Workflow.Node.Id)) };
                    case "create": return { result: await wb.write(() => wb.node.create({
                        blueprintId:  f.blueprintId as Foundations.Blueprint.Id,
                        position:     { x: f.positionX, y: f.positionY },
                        staticValues: (f.staticValues ?? {}) as Record<string, unknown>,
                    })) };
                }
                break;

            case "edge":
                switch (f.edgeOperation) {
                    case "create": return { result: await wb.write(() => wb.edge.create({
                        source:       f.sourceNodeId as Workflow.Node.Id,
                        sourceHandle: f.sourcePortId as Foundations.Port.Output.Id,
                        target:       f.targetNodeId as Workflow.Node.Id,
                        targetHandle: f.targetPortId as Foundations.Port.Input.Id,
                    })) };
                    case "delete": return { result: await wb.write(() => wb.edge.delete(f.edgeId as Workflow.Edge.Id)) };
                }
                break;

            case "field": {
                const nodeId  = f.fieldNodeId as Workflow.Node.Id;
                const fieldId = f.fieldId as Foundations.Field.Id;

                switch (f.fieldOperation) {
                    case "get": return { result: await wb.field.get(nodeId, fieldId) };
                    case "set": return { result: await wb.write(() => wb.field.set(nodeId, fieldId, f.fieldValue)) };
                }
                break;
            }
        }

        throw new Error("Unsupported operation");
    }
}
