import type { Gateway } from "@pretzel-graph/shared/domain"
import type { GatewaySDK } from "./sdk"

export const _gatewaySelectors_ = {
    // On means the user wants it running; failed is on but broken.
    isEnabled: (connection: Gateway.Connection): boolean =>
        connection.status !== 'inactive',

    byFolderId: (state: GatewaySDK.State, folderId: Gateway.Connection['folderId']): Gateway.Connection[] =>
        Object.values(state.connections).filter(c => c.folderId === folderId),
}

export type _GatewaySDKSelectors = typeof _gatewaySelectors_
