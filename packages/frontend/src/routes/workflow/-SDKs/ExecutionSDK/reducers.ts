import { Execution, Recording } from "@pretzel-graph/shared/domain";
import type { ExecutionSDK, ExecutionSDKImpl } from "./sdk";

export type State = ExecutionSDK.State;

const ensureRecording = (s: State): Recording => {
    if (!s.recordingViewer.currentRecording) {
        const execution = s.currentExecution!;
        s.recordingViewer.currentRecording = {
            id:          Recording.createId(execution.id),
            executionId: execution.id,
            workflowId:  execution.workflow_id,
            createdAt:   new Date().toISOString(),
            tracks:      {},
            units:       {},
            relations:   {},
            dataBank:    { snapshots: {} },
        };
    }
    return s.recordingViewer.currentRecording;
};

export function _createExecutionReducers_(_sdk: ExecutionSDKImpl) {
    return {
        applySessionUpdate: (s, update) => {
            if(!update) return;
            const session = s.currentExecution?.session;
            if (!session)
                return;

            Object.entries(update).forEach(([key, value]) => {
                if(!value) return;
                Object.assign(session[key as keyof Execution.Session], value);
            })
        },
        setSession: (s, session) => {
            if (!s.currentExecution) return;
            s.currentExecution.session = session;
        },
        setStatus: (s, status) => {
            if (!s.currentExecution) return;
            s.currentExecution.status = status;
        },
        setError: (s, error) => {
            if (!s.currentExecution) return;
            s.currentExecution.error = error;
        },
        setCurrentExecution: (s, execution) => {
            s.currentExecution = execution;
        },
        setSelectedIgniter: (s, variant) => {
            s.selectedIgniter = variant;
        },
        setRecordExecution: (s, value) => {
            s.recordExecution = value;
        },
        recordingViewer: {
            setSelectedUoW: (s, id) => {
                s.recordingViewer.selectedUoW = id;
            },
            setZoom: (s, zoom) => {
                s.recordingViewer.zoom = Math.min(10, Math.max(0.02, zoom));
            },
            toggleRemnants: (s) => {
                s.recordingViewer.showRemnants = !s.recordingViewer.showRemnants;
            },
            currentRecording: {
                set: (s, recording) => {
                    s.recordingViewer.currentRecording = recording;
                },
                ensure: ensureRecording,
                patchUnitStarted: (s, unit) => {
                    const rec = _sdk.reducers.recordingViewer.currentRecording.ensure(s);
                    rec.units[unit.id] = unit;
                    const track = rec.tracks[unit.trackId];
                    if (track) {
                        track.unitIds.push(unit.id);
                    } else {
                        rec.tracks[unit.trackId] = { id: unit.trackId, unitIds: [unit.id] };
                    }
                },
                patchUnitCompleted: (s, event) => {
                    const rec = _sdk.reducers.recordingViewer.currentRecording.ensure(s);
                    const unit = rec.units[event.unitId];
                    if (!unit) return;
                    unit.status         = "completed";
                    unit.duration       = event.duration;
                    unit.outputSnapshot = event.outputSnapshot;
                },
                patchUnitFailed: (s, event) => {
                    const rec = _sdk.reducers.recordingViewer.currentRecording.ensure(s);
                    const unit = rec.units[event.unitId];
                    if (!unit) return;
                    unit.status   = "failed";
                    unit.duration = event.duration;
                },
                patchRelationCreateBatch: (s, event) => {
                    const rec = _sdk.reducers.recordingViewer.currentRecording.ensure(s);
                    for (const relation of event.relations) {
                        rec.relations[relation.id] = relation;
                    }
                },
            },
        },
    } satisfies _ExecutionSessionReducers;
}

export interface _ExecutionSessionReducers {
    setSession:          (state: State, session: Execution.Session) => void;
    applySessionUpdate:  (state: State, update?: Execution.Session.Update) => void;
    setStatus:           (state: State, status: Execution.Status) => void;
    setError:            (state: State, error: any) => void;
    setCurrentExecution: (state: State, execution: Execution) => void;
    setSelectedIgniter:  (state: State, variant: Execution.Igniter["variant"]) => void;
    setRecordExecution:  (state: State, value: boolean) => void;
    recordingViewer: {
        setSelectedUoW:   (state: State, id: Recording.UnitOfWork.Id | null) => void;
        setZoom:          (state: State, zoom: number) => void;
        toggleRemnants:   (state: State) => void;
        currentRecording: {
            set:                      (state: State, recording: Recording | null) => void;
            ensure:                   (state: State) => Recording;
            patchUnitStarted:         (state: State, unit: Recording.UnitOfWork) => void;
            patchUnitCompleted:       (state: State, event: Recording.Event.Unit.Completed) => void;
            patchUnitFailed:          (state: State, event: Recording.Event.Unit.Failed) => void;
            patchRelationCreateBatch: (state: State, event: Recording.Event.Relation.CreateBatch) => void;
        };
    };
}
