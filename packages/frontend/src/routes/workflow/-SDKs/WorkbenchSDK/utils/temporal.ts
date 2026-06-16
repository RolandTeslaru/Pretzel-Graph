import { Workflow } from "@pretzel-graph/shared/domain"

// True when two workflow `data` snapshots differ only by things excluded from undo
// history: `ui.viewport` (camera) and `staticValues` (field/input values). Relies on
// immer structural sharing: unchanged slices keep their reference.
export const sameUndoableData = (a: Workflow.Data, b: Workflow.Data): boolean => {
    if (a === b) return true
    for (const k in a) if (k !== 'ui' && k !== 'staticValues' && (a as any)[k] !== (b as any)[k]) return false
    for (const k in b) if (k !== 'ui' && k !== 'staticValues' && !(k in a)) return false
    const au = a.ui, bu = b.ui
    if (au === bu) return true
    for (const k in au) if (k !== 'viewport' && (au as any)[k] !== (bu as any)[k]) return false
    for (const k in bu) if (k !== 'viewport' && !(k in au)) return false
    return true
}
