import { Foundations, type Workflow } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDK } from "../sdk"
import { nodeReducers } from "./node"
import { ShelfSDK } from "../../ShelfSDK/sdk"
import { extractExposedPorts } from "@pretzel-graph/shared/subworkflow"
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint"

function collectUsedDependencyIds(s: WorkbenchSDK.State): Set<Workflow.Id> {
    const usedIds = new Set<Workflow.Id>()
    Object.values(s.data.nodes).forEach(node => {
        if (node.dependency && node.dependency.workflowId)
            usedIds.add(node.dependency.workflowId)
    })
    return usedIds
}

export const dependencyReducers = {
    published: {
        register: (s, dependency) => {
            dependencyReducers.removeUnused(s)
            s.data.dependencies.published[dependency.workflow_id] = dependency
        },
    },
    draft: {
        register: (s, draftDependency) => {
            dependencyReducers.removeUnused(s)
            s.data.dependencies.draft[draftDependency.workflow_id] = draftDependency
        },
    },
    attachToNode: (s, nodeId, workflowId, mode, dependency) => {
        const baseBlueprint = ShelfSDK.state.blueprints["Core.SubWorkflow.Execute" as Foundations.Blueprint.Id]

        const blueprint = Blueprint.createFromDependency(dependency, baseBlueprint)
        nodeReducers.recreate(s, nodeId, blueprint)

        // Register AFTER recreate — recreate calls remove internally, which triggers
        // removeUnused while the node is temporarily absent, wiping any dep registered earlier.
        if (mode === "publication")
            dependencyReducers.published.register(s, dependency as Workflow.Dependency.Publication)
        else
            dependencyReducers.draft.register(s, dependency as Workflow.Dependency.Draft)

        s.data.nodes[nodeId].dependency = { workflowId, mode };
        s.isDirty = true
        nodeReducers.validate(s, nodeId)
    },
    applyUpdate: (s, mode, dependency) => {
        const workflowId = dependency.workflow_id as Workflow.Id

        if (mode === "publication")
            dependencyReducers.published.register(s, dependency as Workflow.Dependency.Publication)
        else
            dependencyReducers.draft.register(s, dependency as Workflow.Dependency.Draft)

        const affectedNodeIds = Object.values(s.data.nodes)
            .filter(n => n.dependency?.workflowId === workflowId && n.dependency?.mode === mode)
            .map(n => n.id)

        const baseBlueprint = ShelfSDK.state.blueprints["Core.SubWorkflow.Execute" as Foundations.Blueprint.Id]

        const blueprint = Blueprint.createFromDependency(dependency, baseBlueprint)

        for (const affectedNodeId of affectedNodeIds) {
            nodeReducers.recreate(s, affectedNodeId, blueprint)
            nodeReducers.validate(s, affectedNodeId)
        }

        if (mode === "publication")
            delete s.dependencyUpdates.published[workflowId]
        else
            delete s.dependencyUpdates.draft[workflowId]
    },
    removeUnused: (s) => {
        const usedIds = collectUsedDependencyIds(s)

        for (const id of Object.keys(s.data.dependencies.published) as Workflow.Id[])
            if (!usedIds.has(id)) delete s.data.dependencies.published[id]

        for (const id of Object.keys(s.data.dependencies.draft) as Workflow.Id[])
            if (!usedIds.has(id)) delete s.data.dependencies.draft[id]
    },
} satisfies DependencyReducers




export interface DependencyReducers {
    applyUpdate: (
        state:      WorkbenchSDK.State,
        mode:       "publication" | "draft",
        dependency: Workflow.Dependency.Publication | Workflow.Dependency.Draft,
    ) => void
    attachToNode: (
        state:      WorkbenchSDK.State,
        nodeId:     Workflow.Node.Id,
        workflowId: Workflow.Id,
        mode:       "publication" | "draft",
        dependency: Workflow.Dependency.Publication | Workflow.Dependency.Draft,
    ) => void
    published: {
        register: (state: WorkbenchSDK.State, dependency: Workflow.Dependency.Publication) => void
    }
    draft: {
        register: (state: WorkbenchSDK.State, draftDependency: Workflow.Dependency.Draft) => void
    }
    removeUnused: (state: WorkbenchSDK.State) => void
}
