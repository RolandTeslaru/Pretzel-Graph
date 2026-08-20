"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeIOService = void 0;
const domain_1 = require("../../../shared/domain");
const node_sdk_1 = require("../../../node-sdk/src/index.js");
const SystemError_1 = require("../../../shared/domain/SystemError");
const errors_1 = require("../errors");
/**
 * A node's input/output data plane: resolve its incoming inputs from edges/static
 * values (`getIncomingData`), project its outputs for emission (`projectOutputs`),
 * and write a single output port value (`write`). Pure `ctx`-in — reaches back only
 * for the event channel.
 */
class NodeIOService {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    writePort = (ctx, nodeId, outputId, value) => {
        const outputPort = ctx.workflowQueryAPI.getOutputPort(nodeId, outputId);
        if (!outputPort)
            throw new errors_1.AggexExecutionError(SystemError_1.SystemError.Code.EXECUTION_NODE_FAILED, `Cannot write unknown output port "${outputId}" on node "${nodeId}"`);
        const projection = node_sdk_1.Synthesizer.project(value, outputPort.variant);
        ctx.updateSession(d => {
            d.node_output_instances[nodeId] ??= {};
            d.node_output_projections[nodeId] ??= {};
            d.node_output_instances[nodeId][outputId] = value;
            d.node_output_projections[nodeId][outputId] = projection;
        });
        ctx.realtimeAPI.emit(domain_1.Execution.Event.create("session:patch", {
            sessionPatch: {
                upsert: {
                    node_output_projections: {
                        [nodeId]: {
                            [outputId]: projection,
                        },
                    },
                },
            },
        }));
    };
    getIncomingData = (ctx, nodeId, incomingSignals = new Set(), keepMissingPorts = false) => {
        const staticValues = ctx.workflowData.staticValues[nodeId] ?? {};
        const resolved = {};
        const incomingEdgeByPort = ctx.workflowCache.inputHandlesMap[nodeId];
        const inputs = ctx.workflowQueryAPI.getInputs(nodeId);
        for (const input of inputs) {
            const edgeId = incomingEdgeByPort[input.id];
            const edge = ctx.workflowCache.edges[edgeId];
            if (edge) {
                if (incomingSignals.has(edge.source.nodeId) === false) {
                    if (keepMissingPorts)
                        resolved[input.id] = undefined;
                    continue;
                }
                const sourceOutputs = ctx.session.node_output_instances[edge.source.nodeId];
                if (sourceOutputs) {
                    const rawReference = sourceOutputs[edge.source.portId];
                    // undefined = nothing produced yet (keep waiting).
                    // null      = produced-but-empty, only ExposeInputPort emits it (settled).
                    // Keep them distinct; null bypasses ensureReference (which would throw).
                    if (rawReference === undefined)
                        resolved[input.id] = undefined;
                    else if (rawReference === null)
                        resolved[input.id] = null;
                    else
                        resolved[input.id] = node_sdk_1.Synthesizer.ensureReference(rawReference, input.variant);
                }
                else {
                    resolved[input.id] = undefined;
                }
            }
            else {
                const staticValue = staticValues[input.id];
                const fallback = "initialValue" in input ? input.initialValue : undefined;
                const raw = staticValue ?? fallback;
                if (raw !== undefined) {
                    resolved[input.id] = node_sdk_1.Synthesizer.synthesizeInput(input, raw);
                }
                else {
                    resolved[input.id] = undefined;
                }
            }
        }
        return resolved;
    };
    projectOutputs = (ctx, result, wfNode) => {
        const projected = {};
        const outputs = ctx.workflowQueryAPI.getOutputs(wfNode.id);
        for (const output of outputs) {
            const key = output.id;
            if (key in result) {
                if (result[key] === undefined)
                    projected[key] = undefined;
                else
                    projected[key] = node_sdk_1.Synthesizer.project(result[key], output.variant);
            }
        }
        return projected;
    };
}
exports.NodeIOService = NodeIOService;
