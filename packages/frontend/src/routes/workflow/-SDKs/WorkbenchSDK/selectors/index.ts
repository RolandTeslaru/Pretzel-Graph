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
import type { Workflow } from '@pretzel-graph/shared/domain';

export interface WorkbenchSDKSelectors {
    getClickedNode : (state: WorkbenchSDK.State) => Workflow.Node | null
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
