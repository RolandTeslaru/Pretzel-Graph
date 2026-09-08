import type { Foundations } from "../../Foundations"
import type { Validation } from "../../Validation"
import { Workflow } from "../../Workflow"
import { documentReducers } from "./reducers"
import { documentSelectors, type DocumentSelectors } from "./selectors"

export type { NodeUI, LegacyExpressionContext } from "./selectors/node"
export type { Selection } from "./reducers/selection"
export type { DeriveResult } from "./reducers/node/lifecycle"
export { conditionTreeReducers } from "./reducers/conditionTree"
export { type ClipboardPayload, ClipboardPayloadSchema, CLIPBOARD_KIND, CLIPBOARD_VERSION } from "./clipboard-payload"

/**
 * The workflow-editing working set: the persisted data plus everything derived from it that
 * the reducers read and write. `data` is what persists; the rest is rebuilt on load.
 */
export interface Document {
    workflowId: Workflow.Id
    data:       Workflow.Data

    cache:      Workflow.Cache
    /** Bases this workflow's nodes reference, plus every derived variant they resolve to. */
    blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint>
    issues:     Validation.Issue.Workflow
    cycles:     Workflow.Node.Id[][]
    stronglyConnectedComponents: Array<Set<Workflow.Node.Id>>
    cyclesDirty: boolean
    dependencyUpdates: {
        published: Workflow.Dependency.Publication.UpdateMap
        draft:     Record<Workflow.Id, Workflow.Dependency.Draft.UpdateInfo>
    }

    /** The document differs from what was last persisted. */
    isDirty: boolean

    // Reducers reach their siblings through the document, so it carries them.
    reducers:  Document.Reducers
    selectors: Document.Selectors
}

export namespace Document {
    export type Reducers  = typeof documentReducers
    export type Selectors = DocumentSelectors

    export const reducers  = documentReducers
    export const selectors = documentSelectors

    /**
     * Wraps a mutation so the document is settled when it returns: edges that moved mark cycles
     * dirty, and cycles are recomputed once at the end rather than after every reducer.
     */
    export function withCyclesRecompute<A extends unknown[], T>(
        fn: (document: Document, ...args: A) => T,
    ): (document: Document, ...args: A) => T {
        return (document, ...args) => {
            const result = fn(document, ...args)

            if (document.cyclesDirty) {
                documentReducers.workflow.recomputeAllCycles(document)
                document.cyclesDirty = false
            }

            return result
        }
    }

    export interface DriverConnection {
        source: Workflow.Node.Id
        sourceHandle: Foundations.Port.Output.Id
        target: Workflow.Node.Id
        targetHandle: Foundations.Port.Input.Id
    }

    // The cache is derived here rather than taken, so a document can never carry a stale one.
    export function create(
        workflowId: Workflow.Id,
        data:       Workflow.Data,
        blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint>,
    ): Document {
        return {
            workflowId,
            data,
            blueprints,
            cache:  Workflow.createCache(data, blueprints),
            issues: { nodes: {}, cycles: [] },
            cycles: [],
            stronglyConnectedComponents: [],
            cyclesDirty: true,
            dependencyUpdates: { published: {}, draft: {} },
            isDirty: false,
            reducers:  documentReducers,
            selectors: documentSelectors,
        }
    }
}
