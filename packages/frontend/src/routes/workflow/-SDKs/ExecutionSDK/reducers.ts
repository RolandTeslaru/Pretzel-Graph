import { Execution, Recording } from "@pretzel-graph/shared/domain";
import type { ExecutionSDK, ExecutionSDKImpl } from "./sdk";

export type State = ExecutionSDK.State;

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
        setRecording: (s, recording) => {
            s.currentRecording = recording;
        },
        patchUnitStarted: (s, unit) => {
            if (!s.currentRecording) return;
            s.currentRecording.units[unit.id] = unit;
            const track = s.currentRecording.tracks[unit.trackId];
            if (track) {
                track.unitIds.push(unit.id);
            } else {
                s.currentRecording.tracks[unit.trackId] = { id: unit.trackId, unitIds: [unit.id] };
            }
        },
        patchUnitCompleted: (s, event) => {
            if (!s.currentRecording) return;
            const unit = s.currentRecording.units[event.unitId];
            if (!unit) return;
            unit.status = "completed";
            unit.duration = event.duration;
            unit.outputSnapshot = event.outputSnapshot;
            for (const snap of event.snapshots) {
                s.currentRecording.dataBank.snapshots[snap.id] = snap;
            }
        },
        patchUnitFailed: (s, event) => {
            if (!s.currentRecording) return;
            const unit = s.currentRecording.units[event.unitId];
            if (!unit) return;
            unit.status = "failed";
            unit.duration = event.duration;
        },
        patchRelationCreated: (s, event) => {
            if (!s.currentRecording) return;
            s.currentRecording.relations[event.relation.id] = event.relation;
            if (event.snapshot) {
                s.currentRecording.dataBank.snapshots[event.snapshot.id] = event.snapshot;
            }
        },
        setSelectedUoW: (s, id) => {
            s.selectedUoW = id;
        },
        setZoom: (s, zoom) => {
            s.zoom = Math.min(10, Math.max(0.02, zoom));
        },
        toggleRemnants: (s) => {
            s.showRemnants = !s.showRemnants;
        },
    } satisfies _ExecutionSessionReducers;
}

export interface _ExecutionSessionReducers {
    setSession:          (state: State, session: Execution.Session) => void;
    applySessionUpdate:  (state: State, update?: Execution.Session.Update) => void
    setStatus:           (state: State, status: Execution.Status) => void;
    setError:            (state: State, error: any) => void;
    setCurrentExecution: (state: State, execution: Execution) => void;
    setRecording:        (state: State, recording: Recording | null) => void;
    patchUnitStarted:    (state: State, unit: Recording.UnitOfWork) => void;
    patchUnitCompleted:  (state: State, event: Recording.Event.UnitCompleted) => void;
    patchUnitFailed:     (state: State, event: Recording.Event.UnitFailed) => void;
    patchRelationCreated:(state: State, event: Recording.Event.RelationCreated) => void;
    setSelectedUoW:      (state: State, id: Recording.UnitOfWork.Id | null) => void;
    setZoom:             (state: State, zoom: number) => void;
    toggleRemnants:      (state: State) => void;
};
