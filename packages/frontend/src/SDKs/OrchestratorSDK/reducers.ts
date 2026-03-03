import { Execution } from "@vx-agent-editor/shared/domain"
import type { OrchestratorSDK } from "./sdk"
import { cloneDeep } from "lodash"

export const orchestratorSDKReducers = {
    context: {
        reset: (s) => {
            s.executionContext = cloneDeep(Execution.Context.INITIAL);
        },
        update: (s ) => {

        }
    },
    nodeStatuses: {
        update: (s) => {

        },
        reset: (s) => {
            s.nodeStatuses = {}
        }
    }
}satisfies OrchestratorSDKReducers

interface OrchestratorSDKReducers {
    context: {
        reset: (state: OrchestratorSDK.State) => void
    },
    nodeStatuses: {
        reset: (state: OrchestratorSDK.State) => void 
    }
}