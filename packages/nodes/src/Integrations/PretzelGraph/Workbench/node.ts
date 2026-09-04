import { RuntimeNode, type InferOutputs } from "@pretzel-graph/node-sdk";
import type { Foundations, Workflow } from "@pretzel-graph/shared/domain";

import { WorkbenchClient } from "../client";
import { Operations } from "../domain/operations";
import { Blueprint } from "./blueprint";


export class Node extends RuntimeNode<typeof Blueprint> {

    // Reads run on a snapshot and never hold the workflow; writes run in one short hold.
    protected override async onRun(): Promise<InferOutputs<typeof Blueprint>> {
        const f  = this.fieldValues;
        const wb = new WorkbenchClient(this.context.internalAPI, f.workflowId as Workflow.Id);

        switch (f.target) {
            case "workflow": {
                const document = await wb.read();

                return { result: Operations.workflow.get(document) };
            }

            case "node":
                switch (f.nodeOperation) {
                    case "get": {
                        const document = await wb.read();

                        return { result: Operations.node.get(document, f.getNodeId as Workflow.Node.Id) };
                    }
                    case "delete": return { result: await wb.write(d => Operations.node.delete(d, f.deleteNodeId as Workflow.Node.Id)) };
                    case "create": return { result: await wb.write(d => Operations.node.create(
                        d,
                        f.blueprintId as Foundations.Blueprint.Id,
                        { x: f.positionX, y: f.positionY },
                        (f.staticValues ?? {}) as Record<string, unknown>,
                    )) };
                }
                break;

            case "edge":
                switch (f.edgeOperation) {
                    case "create": return { result: await wb.write(d => Operations.edge.create(d, {
                        source:       f.sourceNodeId as Workflow.Node.Id,
                        sourceHandle: f.sourcePortId as Foundations.Port.Output.Id,
                        target:       f.targetNodeId as Workflow.Node.Id,
                        targetHandle: f.targetPortId as Foundations.Port.Input.Id,
                    })) };
                    case "delete": return { result: await wb.write(d => Operations.edge.delete(d, f.edgeId as Workflow.Edge.Id)) };
                }
                break;

            case "field": {
                const nodeId  = f.fieldNodeId as Workflow.Node.Id;
                const fieldId = f.fieldId as Foundations.Field.Id;

                switch (f.fieldOperation) {
                    case "get": {
                        const document = await wb.read();

                        return { result: Operations.field.get(document, nodeId, fieldId) };
                    }
                    case "set": return { result: await wb.write(d => Operations.field.set(d, nodeId, fieldId, f.fieldValue)) };
                }
                break;
            }
        }

        throw new Error("Unsupported operation");
    }
}
