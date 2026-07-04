import { nodeSelectors, type NodeSelectors } from './node';
import { fieldSelectors, type FieldSelectors } from './field';
import { inputSelectors, type InputSelectors } from './input';
import { outputSelectors, type OutputSelectors } from './output';
import { portSelectors, type PortSelectors } from './port';
import { cacheSelectors, type CacheSelectors } from './cache';
import { executionSelectors, type ExecutionSelectors } from './execution';
import { graphSelectors, type GraphSelectors } from './graph';
import { dependencySelectors, type DependencySelectors } from './dependency';
import { layoutSelectors, type LayoutSelectors } from './layout';
import type { WorkbenchSDK } from '../sdk';
import type { Foundations, Workflow } from '@pretzel-graph/shared/domain';
import { ShelfSDK } from '../../ShelfSDK/sdk';

export interface WorkbenchSDKSelectors {
    getClickedNode : (state: WorkbenchSDK.State) => Workflow.Node | null
    /** Distinct base blueprint ids of the workflow's own (top-level) nodes — excludes nested dependency snapshots. */
    getBlueprintIds: (state: WorkbenchSDK.State, workflow: Workflow) => Foundations.Blueprint.Id[]
    /** Resolved blueprint per node (keyed by reconciledBlueprintId ?? blueprintId), for validation. */
    getBlueprints  : (state: WorkbenchSDK.State) => Record<Foundations.Blueprint.Id, Foundations.Blueprint>
    node           : NodeSelectors
    field          : FieldSelectors
    input          : InputSelectors
    output         : OutputSelectors
    port           : PortSelectors
    cache          : CacheSelectors
    execution      : ExecutionSelectors
    graph          : GraphSelectors
    dependency     : DependencySelectors
    layout         : LayoutSelectors
}

export const workbenchSelectors = {
    getClickedNode : (s) => s.clickedNodeId ? s.data.nodes[s.clickedNodeId] ?? null : null,
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
            const bp = ShelfSDK.state.blueprints[id]
            if (bp) map[id] = bp
        }
        return map
    },
    node           : nodeSelectors,
    field          : fieldSelectors,
    input          : inputSelectors,
    output         : outputSelectors,
    port           : portSelectors,
    cache          : cacheSelectors,
    execution      : executionSelectors,
    graph          : graphSelectors,
    dependency     : dependencySelectors,
    layout         : layoutSelectors,
} satisfies WorkbenchSDKSelectors
