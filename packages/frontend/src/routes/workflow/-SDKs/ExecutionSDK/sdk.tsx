import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { Chat, Execution } from "@pretzel-graph/shared/domain";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { createExecutionSDKActions, type ExecutionSDKActions } from "./actions";
import { _createExecutionReducers_, type _ExecutionSessionReducers } from "./reducers";
import { toast } from "sonner";
import { executionSDKSelectors, type ExecutionSDKSelectors } from "./selectors";

@SDK("Execution")
export class ExecutionSDKImpl extends BaseSDK<ExecutionSDK.State> {

    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ExecutionSDK.State> = createWithEqualityFn(
        immer<ExecutionSDK.State>(() => ({
            jobId: undefined,
            awaitedConfirmation: new Set(),
            session: Execution.Session.createInitial(),
        })),
        shallow
    )

    public readonly reducers: ExecutionSDK.Reducers = _createExecutionReducers_(this)
    public readonly actions: ExecutionSDK.Actions = createExecutionSDKActions(this);
    public readonly selectors: ExecutionSDK.Selectors = executionSDKSelectors;
    
    public useAwaitConfirmation = (event: ExecutionSDK.AwaitedConfirmation): () => void => {
        this.actions.addAwaitedConfirmation(event);
        return () => { this.actions.removeAwaitedConfirmation(event); };
    }
    
    public readonly runtime = {
        unsubscribeFromJobChannel: null as (() => void) | null
    }
    
    public handleOnEvent = (e: Execution.Event) => {
        console.log("Execution Session Event Received:", e.type)
        switch(e.type){
            case "node:started":
                this.setState(s => {
                    if(e.stateUpdate)
                        this.reducers.applyUpdate(s, e.stateUpdate);
                    this.reducers.setNodeStatus(s, e.nodeId, { status: "running", started_at: new Date().toISOString() })
                })
                break;
            case "node:completed":
                this.setState(s => {
                    s.currentExecution!.session.node_output_projections[e.nodeId] = e.output as any;
                    if(e.stateUpdate)
                        this.reducers.applyUpdate(s, e.stateUpdate);
                    this.reducers.setNodeStatus(s, e.nodeId, { status: "completed", completed_at: new Date().toISOString() })
                })
                break;
            case "node:waiting":
                this.setState(s => {
                    this.reducers.setNodeStatus(s, e.nodeId, { status: "waiting" })
                })
                break;
            case "node:error":
                this.setState(s => {
                    this.reducers.setNodeStatus(s, e.nodeId, { status: "failed", error: e.error, completed_at: new Date().toISOString() })
                })
                break;
            case "update":
                this.setState(s => {
                    this.reducers.applyUpdate(s, e.update);
                })
                break;
            default:
                toast.error(`Received unknown event: ${e.type}`)
        }
    }
}

export const ExecutionSDK = SDK.get<ExecutionSDKImpl>("Execution")




export namespace ExecutionSDK {
    export type AwaitedConfirmation = "started" | "paused" | "resumed" | "terminated" | "suspended"

    export type State = {
        currentExecution?: Execution
        awaitedConfirmation: Set<AwaitedConfirmation>
    }

    export type Reducers = _ExecutionSessionReducers
    export type Actions = ExecutionSDKActions;
    export type Selectors = ExecutionSDKSelectors
}
