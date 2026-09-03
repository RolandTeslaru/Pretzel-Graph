import { nodeSelectors, type NodeSelectors } from './node';
import { edgeSelectors, type EdgeSelectors } from './edge';
import { fieldSelectors, type FieldSelectors } from './field';
import { inputSelectors, type InputSelectors } from './input';
import { credentialSelectors, type CredentialSelectors } from './credential';
import { outputSelectors, type OutputSelectors } from './output';
import { portSelectors, type PortSelectors } from './port';
import { cacheSelectors, type CacheSelectors } from './cache';
import { blueprintSelectors, type BlueprintSelectors } from './blueprint';
import { executionSelectors, type ExecutionSelectors } from './execution';
import { graphSelectors, type GraphSelectors } from './graph';
import { dependencySelectors, type DependencySelectors } from './dependency';
import { layoutSelectors, type LayoutSelectors } from './layout';
import { workflowSelectors, type WorkflowSelectors } from './workflow';
import type { Document } from "../index";
import type { Foundations } from "../../../Foundations";
import type { Workflow } from "../../../Workflow";

export interface DocumentSelectors {
    /** Distinct base blueprint ids of the workflow's own (top-level) nodes — excludes nested dependency snapshots. */
    getBlueprintIds: (state: Document, workflow: Workflow) => Foundations.Blueprint.Id[]
    /** Resolved blueprint per node (keyed by reconciledBlueprintId ?? blueprintId), for validation. */
    getBlueprints  : (state: Document) => Record<Foundations.Blueprint.Id, Foundations.Blueprint>
    blueprint      : BlueprintSelectors
    node           : NodeSelectors
    edge           : EdgeSelectors
    field          : FieldSelectors
    input          : InputSelectors
    credential     : CredentialSelectors
    output         : OutputSelectors
    port           : PortSelectors
    cache          : CacheSelectors
    execution      : ExecutionSelectors
    graph          : GraphSelectors
    dependency     : DependencySelectors
    layout         : LayoutSelectors
    workflow       : WorkflowSelectors
}

export const documentSelectors: DocumentSelectors = {
    getBlueprintIds: (_s, workflow) => {
        const ids = new Set<Foundations.Blueprint.Id>()
        for (const node of Object.values(workflow.data.nodes)){
            ids.add(node.blueprintId)
            if(node.reconciledBlueprintId)
                ids.add(node.reconciledBlueprintId)
        }
        return [...ids]
    },
    getBlueprints: (s) => {
        const map: Record<Foundations.Blueprint.Id, Foundations.Blueprint> = {}
        for (const node of Object.values(s.data.nodes)) {
            const id = node.reconciledBlueprintId ?? node.blueprintId
            const bp = s.blueprints[id]
            if (bp) map[id] = bp
        }
        return map
    },
    blueprint      : blueprintSelectors,
    node           : nodeSelectors,
    edge           : edgeSelectors,
    field          : fieldSelectors,
    input          : inputSelectors,
    credential     : credentialSelectors,
    output         : outputSelectors,
    port           : portSelectors,
    cache          : cacheSelectors,
    execution      : executionSelectors,
    graph          : graphSelectors,
    dependency     : dependencySelectors,
    layout         : layoutSelectors,
    workflow       : workflowSelectors,
}
