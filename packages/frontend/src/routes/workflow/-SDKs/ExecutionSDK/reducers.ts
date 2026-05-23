import { Execution, Recording } from "@pretzel-graph/shared/domain";
import type { ExecutionSDK, ExecutionSDKImpl } from "./sdk";

export type State = ExecutionSDK.State;

const ensureRecording = (s: State): Recording => {
    if (!s.currentRecording) {
        const execution = s.currentExecution!;
        s.currentRecording = {
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
    return s.currentRecording;
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
        currentRecording: {
            set: (s, recording) => {
                s.currentRecording = recording;
            },
            ensure: ensureRecording,
            patchUnitStarted: (s, unit) => {
                const rec = _sdk.reducers.currentRecording.ensure(s);
                rec.units[unit.id] = unit;
                const track = rec.tracks[unit.trackId];
                if (track) {
                    track.unitIds.push(unit.id);
                } else {
                    rec.tracks[unit.trackId] = { id: unit.trackId, unitIds: [unit.id] };
                }
            },
            patchUnitCompleted: (s, event) => {
                const rec = _sdk.reducers.currentRecording.ensure(s);
                const unit = rec.units[event.unitId];
                if (!unit) return;
                unit.status         = "completed";
                unit.duration       = event.duration;
                unit.outputSnapshot = event.outputSnapshot;
            },
            patchUnitFailed: (s, event) => {
                const rec = _sdk.reducers.currentRecording.ensure(s);
                const unit = rec.units[event.unitId];
                if (!unit) return;
                unit.status   = "failed";
                unit.duration = event.duration;
            },
            patchRelationCreateBatch: (s, event) => {
                const rec = _sdk.reducers.currentRecording.ensure(s);
                for (const relation of event.relations) {
                    rec.relations[relation.id] = relation;
                }
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
    currentRecording: {
        set:                      (state: State, recording: Recording | null) => void;
        ensure:                   (state: State) => Recording;
        patchUnitStarted:         (state: State, unit: Recording.UnitOfWork) => void;
        patchUnitCompleted:       (state: State, event: Recording.Event.Unit.Completed) => void;
        patchUnitFailed:          (state: State, event: Recording.Event.Unit.Failed) => void;
        patchRelationCreateBatch: (state: State, event: Recording.Event.Relation.CreateBatch) => void;
    };
}
