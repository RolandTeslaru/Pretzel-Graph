import { Execution } from "@pretzel-graph/shared/domain";
import type { Workflow } from "@pretzel-graph/shared/domain";
import type { ExecutionSDK, ExecutionSDKImpl } from "./sdk";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";
import {
    getTimelineLayout,
    getTotalDuration,
    buildTrackLayout,
    resolveTimelineNodes,
    emptyTimelineLayout,
} from "./selectors";
import { makeTimeScale, VIEW_MODES, type TimelineViewMode } from "./ui/Timeline/time-scale";

export type State = ExecutionSDK.State;

// Default/empty geometry — used to seed state and to reset between executions.
export const initialTimelineState = (): ExecutionSDK.State["timeline"] => ({
    zoom:          0.2,
    viewMode:      "linear",
    showRemnants:  true,
    selectedUoW:   null,
    layout:        emptyTimelineLayout(),
    scale:         makeTimeScale("linear", 0.2, null, 0),
    totalDuration: 0,
    totalWidth:    400,
});

// Rebuild scale + sizes from the live recording + current zoom/viewMode. Layout
// (track geometry) is maintained incrementally, so this only touches the parts
// that depend on durations/zoom. Called once per streaming flush and on zoom /
// viewMode / full-recording changes.
const recomputeGeometry = (s: State) => {
    const rec = s.currentExecution?.recording ?? null;
    const t   = s.timeline;
    t.totalDuration = getTotalDuration(rec);
    t.scale         = makeTimeScale(t.viewMode, t.zoom, rec, t.totalDuration);
    const scaleW    = t.viewMode === "linear" ? t.totalDuration * t.zoom : t.scale.totalWidth;
    t.totalWidth    = Math.max(scaleW + 80, 400);
    s.isTimelineGeometryDirty = false;
};

const ensureRecording = (s: State): Execution.Recording => {
    const execution = s.currentExecution!;
    if (!execution.recording) {
        execution.recording = {
            workflowDataSnapshot: { nodes: {}, edges: {} } as any,
            tracks:               {},
            units:                {},
            relations:            {},
            dataBank:             { snapshots: {} },
        };
    }
    return execution.recording;
};

export function _createExecutionReducers_(_sdk: ExecutionSDKImpl) {
    return {
        currentExecution: {
            set: (s, execution) => {
                s.currentExecution = execution;
            },
            session: {
                set: (s, session) => {
                    if (!s.currentExecution) return;
                    s.currentExecution.session = session;
                },
                // One partial change set. Upserts merge in first, then removals drop keys —
                // so a single patch can replace one entry and delete another.
                applyPatch: (s, patch) => {
                    if (!patch) return;

                    const session = s.currentExecution?.session;
                    if (!session) return;

                    Object.entries(patch.upsert ?? {}).forEach(([key, value]) => {
                        if (!value) return;

                        Object.assign(session[key as keyof Execution.Session], value);
                    })

                    Object.entries(patch.delete ?? {}).forEach(([key, removals]) => {
                        if (!removals) return;

                        const slice = session[key as keyof Execution.Session] as Record<string, unknown>;
                        if (!slice) return;

                        Object.keys(removals).forEach(recordKey => { delete slice[recordKey] });
                    })
                },
            },
            setStatus: (s, status) => {
                if (!s.currentExecution) return;
                s.currentExecution.status = status;
            },
            setError: (s, error) => {
                if (!s.currentExecution) return;
                s.currentExecution.error = error;
            },
            recording: {
                set: (s, recording) => {
                    if (s.currentExecution) s.currentExecution.recording = recording;
                    s.isTimelineGeometryDirty = true;
                },
                ensure: ensureRecording,
                unit: {
                    patchStarted: (s, unit) => {
                        const rec = _sdk.reducers.currentExecution.recording.ensure(s);
                        rec.units[unit.id] = unit;
                        s.isTimelineGeometryDirty = true;

                        const track = rec.tracks[unit.trackId];
                        if (track) {
                            track.unitIds.push(unit.id);
                        } else {
                            // A track is born — append its (append-only) geometry row.
                            rec.tracks[unit.trackId] = { id: unit.trackId, unitIds: [unit.id] };
                            _sdk.reducers.timeline.appendTrack(s, unit.trackId);
                        }
                    },
                    patchCompleted: (s, event) => {
                        const rec = _sdk.reducers.currentExecution.recording.ensure(s);
                        const unit = rec.units[event.unitId];
                        if (!unit)
                            return;

                        unit.status         = "completed";
                        unit.duration       = event.duration;
                        unit.outputSnapshot = event.outputSnapshot;

                        s.isTimelineGeometryDirty = true;

                        if (event.metrics)
                            unit.metrics = event.metrics;
                    },
                    patchFailed: (s, event) => {
                        const rec = _sdk.reducers.currentExecution.recording.ensure(s);
                        const unit = rec.units[event.unitId];
                        if (!unit)
                            return;

                        unit.status   = "failed";
                        unit.duration = event.duration;

                        s.isTimelineGeometryDirty = true;

                        if (event.metrics)
                            unit.metrics = event.metrics;
                    },
                },
                relation: {
                    patchCreateBatch: (s, event) => {
                        const rec = _sdk.reducers.currentExecution.recording.ensure(s);
                        for (const relation of event.relations)
                            rec.relations[relation.id] = relation;
                    },
                },
            },
        },
        igniter: {
            setShouldRecord: (s, record) => { s.igniterAttributes.record = record; },
            setShouldDebug: (s, debug) => { s.igniterAttributes.debug = debug; }
        },

        awaitedConfirmation: {
            add:    (s, event) => { s.awaitedConfirmation.add(event); },
            remove: (s, event) => { s.awaitedConfirmation.delete(event); },
        },

        timeline: {
            setZoom: (s, zoom) => {
                s.timeline.zoom = Math.min(10, Math.max(0.02, zoom));
                recomputeGeometry(s);
            },
            setViewMode: (s, mode) => {
                s.timeline.viewMode = mode;
                recomputeGeometry(s);
            },
            toggleViewMode: (s) => {
                const i = VIEW_MODES.indexOf(s.timeline.viewMode);
                s.timeline.viewMode = VIEW_MODES[(i + 1) % VIEW_MODES.length];
                recomputeGeometry(s);
            },
            toggleRemnants: (s) => { s.timeline.showRemnants = !s.timeline.showRemnants; },
            selectUoW: (s, id) => { s.timeline.selectedUoW = id; },

            // Append one track's geometry row (called when a track is born).
            appendTrack: (s, trackId) => {
                const layout = s.timeline.layout;
                if (layout.byTrackId.has(trackId)) 
                    return;

                const nodes = resolveTimelineNodes(s.currentExecution?.recording ?? null, WorkbenchSDK.state.data.nodes);
                const row = buildTrackLayout(trackId, layout.totalHeight, nodes);
                
                layout.tracks.push(row);
                layout.byTrackId.set(trackId, row);
                layout.totalHeight = row.top + row.height;
            },
            // One-shot rebuild from a fully-loaded recording (non-live path).
            rebuild: (s) => {
                const rec = s.currentExecution?.recording ?? null;
                const nodes = resolveTimelineNodes(rec, WorkbenchSDK.state.data.nodes);
                s.timeline.layout = getTimelineLayout(rec, nodes);
                recomputeGeometry(s);
            },
            // Reset geometry/selection between executions (keeps zoom/viewMode prefs).
            reset: (s) => {
                s.timeline.layout = emptyTimelineLayout();
                s.timeline.selectedUoW = null;
                recomputeGeometry(s);
            },
            recompute: recomputeGeometry,
        },

    } satisfies _ExecutionSessionReducers;
}

export interface _ExecutionSessionReducers {
    currentExecution: {
        set:                (state: State, execution: Execution) => void;
        session: {
            set:        (state: State, session: Execution.Session) => void;
            applyPatch: (state: State, patch?: Execution.Session.Patch) => void;
        };
        setStatus:          (state: State, status: Execution.Status) => void;
        setError:           (state: State, error: any) => void;
        recording: {
            set:    (state: State, recording: Execution.Recording | null) => void;
            ensure: (state: State) => Execution.Recording;
            unit: {
                patchStarted:   (state: State, unit: Execution.Recording.UnitOfWork) => void;
                patchCompleted: (state: State, event: Execution.Event.Recording.Unit.Completed) => void;
                patchFailed:    (state: State, event: Execution.Event.Recording.Unit.Failed) => void;
            };
            relation: {
                patchCreateBatch: (state: State, event: Execution.Event.Recording.Relation.CreateBatch) => void;
            };
        };
    };
    igniter: {
        setShouldRecord: (state: State, record: boolean) => void;
        setShouldDebug: (state: State, debug: boolean) => void;
    },
    awaitedConfirmation: {
        add:    (state: State, event: ExecutionSDK.AwaitedConfirmation) => void;
        remove: (state: State, event: ExecutionSDK.AwaitedConfirmation) => void;
    },
    timeline: {
        setZoom:        (state: State, zoom: number) => void;
        setViewMode:    (state: State, mode: TimelineViewMode) => void;
        toggleViewMode: (state: State) => void;
        toggleRemnants: (state: State) => void;
        selectUoW:      (state: State, id: Execution.Recording.UnitOfWork.Id | null) => void;
        appendTrack:    (state: State, trackId: Workflow.Node.Id) => void;
        rebuild:        (state: State) => void;
        reset:          (state: State) => void;
        recompute:      (state: State) => void;
    },
}
