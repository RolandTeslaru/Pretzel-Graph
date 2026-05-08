import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { Blueprint as PassthroughBlueprint } from "@pretzel-graph/nodes/Core/Routing/Passthrough/blueprint";

import { AggexCompilerError } from "../../errors";

export namespace SubWorkflowNormalizer {
    export interface InlineNodeMeta {
        parentNodeId: Workflow.Node.Id;
        sourceWorkflowId: Workflow.Id;
        bridge?: "input" | "output";
    }

    export type InlineNodeMetaMap = Record<Workflow.Node.Id, InlineNodeMeta>;

    export interface Result {
        data: Workflow.Data;
        inlineNodeMetaMap: InlineNodeMetaMap;
    }

    interface Context {
        dependencyPath: readonly Workflow.Id[];
    }

    const EXECUTE_SUB_WORKFLOW_BLUEPRINT_ID = "Core.SubWorkflow.Execute";
    const EXPOSE_INPUT_BLUEPRINT_ID = "Core.SubWorkflow.ExposeInputPort";
    const EXPOSE_OUTPUT_BLUEPRINT_ID = "Core.SubWorkflow.ExposeOutputPort";

    const WORKFLOW_ID_FIELD = "workflowId" as Field.Id;
    const EXPOSED_PORT_ID_FIELD = "exposed_port_id" as Field.Id;

    const INPUT_BRIDGE_ID = "__subworkflow_input" as Workflow.Node.Id;
    const OUTPUT_BRIDGE_ID = "__subworkflow_output" as Workflow.Node.Id;




    export function normalize(
        workflowId: Workflow.Id,
        workflowData: Workflow.Data,
        ctx: Context = { dependencyPath: [workflowId] },
    ): Result {
        const data = cloneWorkflowData(workflowData);
        const inlineNodeMetaMap: InlineNodeMetaMap = {};

        for (const node of [...Object.values(data.nodes)]) {
            if (node.blueprintId !== EXECUTE_SUB_WORKFLOW_BLUEPRINT_ID)
                continue;

            inlineExecuteSubWorkflowNode(data, inlineNodeMetaMap, node, ctx);
        }

        return { data, inlineNodeMetaMap };
    }




    function inlineExecuteSubWorkflowNode(
        parentData: Workflow.Data,
        inlineNodeMetaMap: InlineNodeMetaMap,
        executeNode: Workflow.Node,
        ctx: Context,
    ): void {
        const dependencyWorkflowId = getDependencyWorkflowId(parentData, executeNode);
        const dependency = parentData.dependencies[dependencyWorkflowId];

        if (!dependency)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                `Missing dependency workflow "${dependencyWorkflowId}" for Execute Sub-Workflow node`,
                { data: { nodeId: executeNode.id, workflowId: dependencyWorkflowId } },
            );

        if (ctx.dependencyPath.includes(dependencyWorkflowId)) {
            const cyclePath = [...ctx.dependencyPath, dependencyWorkflowId];
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_SUBWORKFLOW_CYCLE,
                `Recursive sub-workflow: ${cyclePath.join(" -> ")}`,
                { data: { nodeId: executeNode.id, cyclePath } },
            );
        }

        const child = normalize(dependencyWorkflowId, dependency.workflow_data, {
            dependencyPath: [...ctx.dependencyPath, dependencyWorkflowId],
        });

        const childData = cloneWorkflowData(child.data);
        addBridgeNodes(childData, parentData, executeNode);
        rewriteExposedInputNodes(childData, executeNode);
        rewriteExposedOutputNodes(childData, executeNode);

        rewriteParentExecuteEdges(parentData, executeNode);
        mergeChildWorkflow(parentData, inlineNodeMetaMap, child.inlineNodeMetaMap, childData, executeNode, dependencyWorkflowId);

        delete parentData.nodes[executeNode.id];
        delete parentData.staticValues[executeNode.id];
        delete parentData.ui.layout[executeNode.id];
    }




    function getDependencyWorkflowId(
        workflowData: Workflow.Data,
        executeNode: Workflow.Node,
    ): Workflow.Id {
        const rawWorkflowId = workflowData.staticValues[executeNode.id]?.[WORKFLOW_ID_FIELD];

        if (typeof rawWorkflowId !== "string" || rawWorkflowId.length === 0)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                "Execute Sub-Workflow node is missing a workflow dependency",
                { data: { nodeId: executeNode.id } },
            );

        return rawWorkflowId as Workflow.Id;
    }




    function addBridgeNodes(
        childData:   Workflow.Data,
        parentData:  Workflow.Data,
        executeNode: Workflow.Node,
    ): void {
        childData.nodes[INPUT_BRIDGE_ID] = createPassthroughNode(
            INPUT_BRIDGE_ID,
            "Sub-Workflow Input",
            executeNode.inputs.map((port, index) => createInputPortFromInput(port, index)),
            executeNode.inputs.map((port, index) => createOutputPortFromInput(port, index)),
            executeNode,
        );

        childData.nodes[OUTPUT_BRIDGE_ID] = createPassthroughNode(
            OUTPUT_BRIDGE_ID,
            "Sub-Workflow Output",
            executeNode.outputs.map((port, index) => createInputPortFromOutput(port, index)),
            executeNode.outputs.map((port, index) => createOutputPortFromOutput(port, index)),
            executeNode,
        );

        const executeStaticValues = parentStaticValuesForBridge(parentData, executeNode);

        childData.staticValues[INPUT_BRIDGE_ID] = executeStaticValues;
        childData.staticValues[OUTPUT_BRIDGE_ID] = {
            ["signalDependency" as Field.Id]: "OR",
            ["dataDependency" as Field.Id]: "OR",
        };
    }




    function rewriteExposedInputNodes(
        childData: Workflow.Data,
        executeNode: Workflow.Node,
    ): void {
        const exposedNodes = Object.values(childData.nodes).filter(
            node => node.blueprintId === EXPOSE_INPUT_BLUEPRINT_ID,
        );

        for (const exposedNode of exposedNodes) {
            const exposedPortId = childData.staticValues[exposedNode.id]?.[EXPOSED_PORT_ID_FIELD];
            const executeInputIndex = executeNode.inputs.findIndex(input => input.id === exposedPortId);

            if (executeInputIndex < 0)
                throw new AggexCompilerError(
                    SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                    "Expose Input Port does not match an Execute Sub-Workflow input",
                    { data: { nodeId: exposedNode.id, exposedPortId, executeNodeId: executeNode.id } },
                );

            for (const edge of Object.values(childData.edges)) {
                if (edge.source.nodeId !== exposedNode.id)
                    continue;

                edge.source = {
                    nodeId: INPUT_BRIDGE_ID,
                    portId: outputPortId(executeInputIndex),
                };
            }

            delete childData.nodes[exposedNode.id];
            delete childData.staticValues[exposedNode.id];
            delete childData.ui.layout[exposedNode.id];
        }
    }




    function rewriteExposedOutputNodes(
        childData: Workflow.Data,
        executeNode: Workflow.Node,
    ): void {
        const exposedNodes = Object.values(childData.nodes).filter(
            node => node.blueprintId === EXPOSE_OUTPUT_BLUEPRINT_ID,
        );
        const exposedNodeIds = new Set(exposedNodes.map(node => String(node.id)));

        for (const output of executeNode.outputs)
            if (!exposedNodeIds.has(String(output.id)))
                throw new AggexCompilerError(
                    SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                    "Execute Sub-Workflow output does not match an Expose Output Port",
                    { data: { nodeId: executeNode.id, outputId: output.id } },
                );

        for (const exposedNode of exposedNodes) {
            const executeOutputIndex = executeNode.outputs.findIndex(output => String(output.id) === String(exposedNode.id));

            if (executeOutputIndex < 0)
                throw new AggexCompilerError(
                    SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                    "Expose Output Port does not match an Execute Sub-Workflow output",
                    { data: { nodeId: exposedNode.id, executeNodeId: executeNode.id } },
                );

            let hasIncomingEdge = false;
            for (const edge of Object.values(childData.edges)) {
                if (edge.target.nodeId !== exposedNode.id)
                    continue;

                hasIncomingEdge = true;
                edge.target = {
                    nodeId: OUTPUT_BRIDGE_ID,
                    portId: inputPortId(executeOutputIndex),
                };
            }

            if (!hasIncomingEdge)
                throw new AggexCompilerError(
                    SystemError.Code.COMPILATION_MISSING_REQUIRED_INPUT,
                    "Expose Output Port is not wired inside the sub-workflow",
                    { data: { nodeId: exposedNode.id, executeNodeId: executeNode.id } },
                );

            delete childData.nodes[exposedNode.id];
            delete childData.staticValues[exposedNode.id];
            delete childData.ui.layout[exposedNode.id];
        }
    }




    function rewriteParentExecuteEdges(
        parentData: Workflow.Data,
        executeNode: Workflow.Node,
    ): void {
        for (const edge of Object.values(parentData.edges)) {
            if (edge.target.nodeId === executeNode.id) {
                const inputIndex = executeNode.inputs.findIndex(input => input.id === edge.target.portId);

                if (inputIndex < 0)
                    throw new AggexCompilerError(
                        SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                        "Execute Sub-Workflow input edge references an unknown input port",
                        { data: { nodeId: executeNode.id, portId: edge.target.portId } },
                    );

                edge.target = {
                    nodeId: scopedNodeId(executeNode.id, INPUT_BRIDGE_ID),
                    portId: inputPortId(inputIndex),
                };
            }

            if (edge.source.nodeId === executeNode.id) {
                const outputIndex = executeNode.outputs.findIndex(output => String(output.id) === String(edge.source.portId));

                if (outputIndex < 0)
                    throw new AggexCompilerError(
                        SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                        "Execute Sub-Workflow output edge references an unknown output port",
                        { data: { nodeId: executeNode.id, portId: edge.source.portId } },
                    );

                edge.source = {
                    nodeId: scopedNodeId(executeNode.id, OUTPUT_BRIDGE_ID),
                    portId: outputPortId(outputIndex),
                };
            }
        }
    }




    function mergeChildWorkflow(
        parentData: Workflow.Data,
        inlineNodeMetaMap: InlineNodeMetaMap,
        childInlineNodeMetaMap: InlineNodeMetaMap,
        childData: Workflow.Data,
        executeNode: Workflow.Node,
        dependencyWorkflowId: Workflow.Id,
    ): void {
        for (const [nodeId, node] of Object.entries(childData.nodes) as [Workflow.Node.Id, Workflow.Node][]) {
            const nextNodeId = scopedNodeId(executeNode.id, nodeId);

            if (parentData.nodes[nextNodeId])
                throw new AggexCompilerError(
                    SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                    "Sub-workflow normalization produced a duplicate node id",
                    { data: { nodeId: nextNodeId, executeNodeId: executeNode.id } },
                );

            parentData.nodes[nextNodeId] = {
                ...node,
                id: nextNodeId,
            };

            const childMeta = childInlineNodeMetaMap[nodeId];
            if (childMeta) {
                const nextParentNodeId = scopedNodeId(executeNode.id, childMeta.parentNodeId);
                inlineNodeMetaMap[nextNodeId] = {
                    ...childMeta,
                    parentNodeId: nextParentNodeId,
                };

                if (!inlineNodeMetaMap[nextParentNodeId]) {
                    const parentMeta = childInlineNodeMetaMap[childMeta.parentNodeId];
                    inlineNodeMetaMap[nextParentNodeId] = parentMeta
                        ? {
                            ...parentMeta,
                            parentNodeId: scopedNodeId(executeNode.id, parentMeta.parentNodeId),
                        }
                        : {
                            parentNodeId: executeNode.id,
                            sourceWorkflowId: dependencyWorkflowId,
                        };
                }
            } else {
                inlineNodeMetaMap[nextNodeId] = {
                    parentNodeId: executeNode.id,
                    sourceWorkflowId: dependencyWorkflowId,
                    bridge: nodeId === INPUT_BRIDGE_ID ? "input" : nodeId === OUTPUT_BRIDGE_ID ? "output" : undefined,
                };
            }
        }

        for (const [edgeId, edge] of Object.entries(childData.edges) as [Workflow.Edge.Id, Workflow.Edge][]) {
            const nextEdgeId = scopedEdgeId(executeNode.id, edgeId);

            parentData.edges[nextEdgeId] = {
                id: nextEdgeId,
                source: {
                    nodeId: scopedNodeId(executeNode.id, edge.source.nodeId),
                    portId: edge.source.portId,
                },
                target: {
                    nodeId: scopedNodeId(executeNode.id, edge.target.nodeId),
                    portId: edge.target.portId,
                },
            };
        }

        for (const [nodeId, staticValues] of Object.entries(childData.staticValues) as [Workflow.Node.Id, Record<Field.Id | Port.Input.Id, unknown>][])
            parentData.staticValues[scopedNodeId(executeNode.id, nodeId)] = { ...staticValues };

        for (const [nodeId, layout] of Object.entries(childData.ui.layout) as [Workflow.Node.Id, Workflow.Layout[Workflow.Node.Id]][])
            parentData.ui.layout[scopedNodeId(executeNode.id, nodeId)] = layout;

        Object.assign(parentData.dependencies, childData.dependencies);
    }




    function createPassthroughNode(
        id:          Workflow.Node.Id,
        displayName: string,
        inputs:      Workflow.Node["inputs"],
        outputs:     Workflow.Node["outputs"],
        executeNode: Workflow.Node,
    ): Workflow.Node {
        return {
            ...PassthroughBlueprint,
            id,
            blueprintId: PassthroughBlueprint.id,
            displayName,
            fields: [...PassthroughBlueprint.fields],
            inputs,
            outputs,
            webhooks: undefined,
            isMinimized: false,
            isDisabled: executeNode.isDisabled,
        } satisfies Workflow.Node;
    }

    function parentStaticValuesForBridge(
        parentData: Workflow.Data,
        executeNode: Workflow.Node,
    ): Record<Field.Id | Port.Input.Id, unknown> {
        const staticValues = parentData.staticValues[executeNode.id] ?? {};
        const bridgeStaticValues: Record<Field.Id | Port.Input.Id, unknown> = {};

        for (let index = 0; index < executeNode.inputs.length; index++) {
            const executeInput = executeNode.inputs[index];
            const value = staticValues[executeInput.id];

            if (value !== undefined)
                bridgeStaticValues[inputPortId(index)] = value;
        }

        const signalDependency = staticValues["signalDependency" as Field.Id];
        if (signalDependency !== undefined)
            bridgeStaticValues["signalDependency" as Field.Id] = signalDependency;

        const dataDependency = staticValues["dataDependency" as Field.Id];
        if (dataDependency !== undefined)
            bridgeStaticValues["dataDependency" as Field.Id] = dataDependency;

        return bridgeStaticValues;
    }

    function createInputPortFromInput(
        port: Port.Input,
        index: number,
    ): Port.Input {
        return {
            ...port,
            id:                 inputPortId(index),
            displayName:        port.displayName ?? `Input ${index}`,
            groupId:            "passthrough" as NonNullable<Port.Input["groupId"]>,
            polymorphicGroupId: `passthrough_${index}`,
        } satisfies Port.Input;
    }

    function createOutputPortFromInput(
        port: Port.Input,
        index: number,
    ): Port.Output {
        const { required: _required, id: _id, ...outputPort } = port;

        return {
            ...outputPort,
            id:                 outputPortId(index),
            displayName:        port.displayName ?? `Output ${index}`,
            groupId:            "passthrough" as NonNullable<Port.Output["groupId"]>,
            polymorphicGroupId: `passthrough_${index}`,
        } satisfies Port.Output;
    }

    function createInputPortFromOutput(
        port: Port.Output,
        index: number,
    ): Port.Input {
        return {
            ...port,
            id:                 inputPortId(index),
            required:           false,
            displayName:        port.displayName ?? `Input ${index}`,
            groupId:            "passthrough" as NonNullable<Port.Input["groupId"]>,
            polymorphicGroupId: `passthrough_${index}`,
        } as Port.Input;
    }

    function createOutputPortFromOutput(
        port: Port.Output,
        index: number,
    ): Port.Output {
        return {
            ...port,
            id:                 outputPortId(index),
            displayName:        port.displayName ?? `Output ${index}`,
            groupId:            "passthrough" as NonNullable<Port.Output["groupId"]>,
            polymorphicGroupId: `passthrough_${index}`,
        } satisfies Port.Output;
    }

    function scopedNodeId(
        parentNodeId: Workflow.Node.Id,
        childNodeId: Workflow.Node.Id,
    ): Workflow.Node.Id {
        return `${parentNodeId}::${childNodeId}` as Workflow.Node.Id;
    }

    function scopedEdgeId(
        parentNodeId: Workflow.Node.Id,
        childEdgeId: Workflow.Edge.Id,
    ): Workflow.Edge.Id {
        return `${parentNodeId}::${childEdgeId}` as Workflow.Edge.Id;
    }

    function inputPortId(index: number): Port.Input.Id {
        return `input_${index}` as Port.Input.Id;
    }

    function outputPortId(index: number): Port.Output.Id {
        return `output_${index}` as Port.Output.Id;
    }

    function cloneWorkflowData(data: Workflow.Data): Workflow.Data {
        return structuredClone(data);
    }
}
