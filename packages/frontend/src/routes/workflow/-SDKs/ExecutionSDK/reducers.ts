import { Execution } from "@pretzel-graph/shared/domain";
import type { ExecutionSDK, ExecutionSDKImpl } from "./sdk";

export type State = ExecutionSDK.State;

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
            setSession: (s, session) => {
                if (!s.currentExecution) return;
                s.currentExecution.session = session;
            },
            applySessionUpdate: (s, update) => {
                if (!update) return;
                const session = s.currentExecution?.session;
                if (!session) return;

                Object.entries(update).forEach(([key, value]) => {
                    if (!value) return;
                    Object.assign(session[key as keyof Execution.Session], value);
                })
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
                },
                ensure: ensureRecording,
                patchUnitStarted: (s, unit) => {
                    const rec = _sdk.reducers.currentExecution.recording.ensure(s);
                    rec.units[unit.id] = unit;
                    const track = rec.tracks[unit.trackId];
                    if (track) {
                        track.unitIds.push(unit.id);
                    } else {
                        rec.tracks[unit.trackId] = { id: unit.trackId, unitIds: [unit.id] };
                    }
                },
                patchUnitCompleted: (s, event) => {
                    const rec = _sdk.reducers.currentExecution.recording.ensure(s);
                    const unit = rec.units[event.unitId];
                    if (!unit) return;
                    unit.status         = "completed";
                    unit.duration       = event.duration;
                    unit.outputSnapshot = event.outputSnapshot;
                    if (event.metrics) unit.metrics = event.metrics;
                },
                patchUnitFailed: (s, event) => {
                    const rec = _sdk.reducers.currentExecution.recording.ensure(s);
                    const unit = rec.units[event.unitId];
                    if (!unit) return;
                    unit.status   = "failed";
                    unit.duration = event.duration;
                    if (event.metrics) unit.metrics = event.metrics;
                },
                patchRelationCreateBatch: (s, event) => {
                    const rec = _sdk.reducers.currentExecution.recording.ensure(s);
                    for (const relation of event.relations) {
                        rec.relations[relation.id] = relation;
                    }
                },
            },
        },
        setSelectedIgniter: (s, variant) => {
            s.selectedIgniter = variant;
        },
        setRecordExecution: (s, value) => {
            s.recordExecution = value;
        },
    } satisfies _ExecutionSessionReducers;
}

export interface _ExecutionSessionReducers {
    currentExecution: {
        set:                (state: State, execution: Execution) => void;
        setSession:         (state: State, session: Execution.Session) => void;
        applySessionUpdate: (state: State, update?: Execution.Session.Update) => void;
        setStatus:          (state: State, status: Execution.Status) => void;
        setError:           (state: State, error: any) => void;
        recording: {
            set:                      (state: State, recording: Execution.Recording | null) => void;
            ensure:                   (state: State) => Execution.Recording;
            patchUnitStarted:         (state: State, unit: Execution.Recording.UnitOfWork) => void;
            patchUnitCompleted:       (state: State, event: Execution.Event.Recording.Unit.Completed) => void;
            patchUnitFailed:          (state: State, event: Execution.Event.Recording.Unit.Failed) => void;
            patchRelationCreateBatch: (state: State, event: Execution.Event.Recording.Relation.CreateBatch) => void;
        };
    };
    setSelectedIgniter: (state: State, variant: Execution.Igniter["variant"]) => void;
    setRecordExecution: (state: State, value: boolean) => void;
}
