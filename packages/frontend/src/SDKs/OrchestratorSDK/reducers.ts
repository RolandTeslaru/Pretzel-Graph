import type { OrchestratorSDK } from "./sdk"

export const orchestratorSDKReducers = {
    nodeStatuses: {
        reset: (s) => {
            s.nodeStatuses = {}
        }
    }
}satisfies OrchestratorSDKReducers

interface OrchestratorSDKReducers {
    nodeStatuses: {
        reset: (state: OrchestratorSDK.State) => void 
    }
}