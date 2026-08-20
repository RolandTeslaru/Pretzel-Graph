"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const domain_1 = require("../../../../../shared/domain");
const system_1 = require("../../../../../shared/system");
const node_1 = require("../ExposeInputPort/node");
class Node extends node_sdk_1.RuntimeNode {
    /** ExposeOutputPort nodes propagate parent outputs directly via enclosingNodeAPI
     *  as they fire — suppress automatic fan-out so the engine doesn't double-signal. */
    PROPAGATION_STRATEGY = node_sdk_1.RuntimeNode.PropagationStrategy.NONE;
    subEnvironment;
    subEngineCtx;
    /** Author-written `$metrics` rollups from the sub-workflow, read back after the sub-run. */
    aggregatedMetrics;
    async onCompile(compilationCtx) {
        const { compilePath, parentWorkflowIgniter } = compilationCtx;
        const workflowNode = this.context.workflowQueryAPI.getNode(this.nodeId);
        const subWorkflowId = workflowNode?.dependencyRef?.workflowId;
        const dependencyMode = workflowNode?.dependencyRef?.mode ?? "publication";
        if (compilePath.includes(subWorkflowId)) {
            const cyclePath = [...compilePath, subWorkflowId];
            throw new Error(`Recursive sub-workflow: ${cyclePath.join(" -> ")}`);
        }
        if (!subWorkflowId)
            throw new Error(`Missing dependency in Execute Sub-Workflow node ${this.nodeId}`);
        const isDraft = dependencyMode === "draft";
        const childWorkflowData = isDraft
            ? structuredClone(this.context.dependencyAPI.getDraft(subWorkflowId).workflow_data)
            : structuredClone(this.context.dependencyAPI.getPublished(subWorkflowId).workflow_data);
        const igniter = {
            variant: "sub_workflow",
            parentNodeId: this.nodeId,
            subWorkflowPath: [...compilePath, subWorkflowId],
            record: parentWorkflowIgniter ? parentWorkflowIgniter.record : false,
            chat_id: this.context.igniter.chat_id ?? undefined,
        };
        const childCompilationCtx = {
            compilePath: [...compilePath, subWorkflowId],
            parentWorkflowIgniter: igniter,
        };
        const execution = {
            id: this.context.executionId,
            workflow_id: subWorkflowId,
            recording: null,
            igniter,
            status: "running",
            duration: 0,
            session: this.context.session,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        this.subEnvironment = this.context.subWorkflowAPI.createEnv();
        const enclosingNodeAPI = {
            writePort: (outputId, value) => {
                this.context.portAPI.write(this.nodeId, outputId, value);
            },
            emitPort: (outputId) => {
                this.context.propagationAPI.emitPort(this.nodeId, outputId);
            },
        };
        this.injectWorkflowConfigValues(childWorkflowData);
        this.subEngineCtx = await this.subEnvironment.compile(subWorkflowId, childWorkflowData, execution, childCompilationCtx, enclosingNodeAPI);
    }
    async onRun(incoming) {
        this.injectInputNodeValues(incoming);
        try {
            await this.subEnvironment.run(this.subEngineCtx);
            this.aggregatedMetrics = normalizeMetrics(this.subEngineCtx.airlockAPI.readGlobal(domain_1.Airlock.Globals.METRICS));
            // getPropagationStrategy() returns "none" — ExposeOutputPort nodes propagate
            // parent outputs via enclosingNodeAPI as they fire; returning {} here avoids
            // a second fan-out signal from the engine on completion.
            return {};
        }
        catch (err) {
            system_1.System.log.error("[ExecuteSubWorkflow:onRun] sub-environment threw", {
                error: err instanceof Error ? err.message : String(err),
            });
            throw new Error(`Error executing sub-workflow: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    onRecordMetrics() {
        return this.aggregatedMetrics;
    }
    injectWorkflowConfigValues(childWorkflowData) {
        childWorkflowData.staticValues[domain_1.Workflow.WORKFLOW_CONFIG_NODE_ID] = this.fieldValues;
    }
    injectInputNodeValues(incoming) {
        const exposeInputNodes = this.subEngineCtx.workflowQueryAPI
            .getNodesByBlueprint("Core.SubWorkflow.ExposeInputPort");
        for (const { node } of exposeInputNodes) {
            const instance = this.subEngineCtx.instanceRegistryAPI.get(node.id);
            if (!(instance instanceof node_1.Node))
                continue;
            const exposeNodeId = instance.fieldValues.exposed_port_id;
            const dynamicInputs = incoming;
            system_1.System.log.debug("[ExecuteSubWorkflow:onRun] injecting exposed input port", {
                exposed_port_id: exposeNodeId,
                value: JSON.stringify(dynamicInputs[exposeNodeId])?.slice(0, 100),
            });
            instance.injectedData = dynamicInputs[exposeNodeId];
        }
    }
}
exports.Node = Node;
const METRIC_TYPES = new Set([
    "number", "string", "duration_ms", "currency_usd", "tokens",
]);
const isMetricType = (t) => typeof t === "string" && METRIC_TYPES.has(t);
// Normalizes the author-written `$metrics` bag into UoW metrics. Each entry is either a raw
// scalar (`$metrics.count = 5`) or a full descriptor (`$metrics.cost = { value, type, displayName }`).
// Non-conforming entries are dropped so a malformed write can't break the timeline renderer.
function normalizeMetrics(raw) {
    if (!raw || typeof raw !== "object")
        return undefined;
    const out = {};
    for (const [key, val] of Object.entries(raw)) {
        if (typeof val === "number" || typeof val === "string") {
            out[key] = {
                displayName: key,
                value: val,
                type: typeof val === "number" ? "number" : "string",
            };
            continue;
        }
        if (val && typeof val === "object") {
            const d = val;
            if (typeof d.value !== "number" && typeof d.value !== "string")
                continue;
            out[key] = {
                displayName: typeof d.displayName === "string" ? d.displayName : key,
                value: d.value,
                type: isMetricType(d.type)
                    ? d.type
                    : (typeof d.value === "number" ? "number" : "string"),
            };
        }
    }
    return Object.keys(out).length > 0 ? out : undefined;
}
