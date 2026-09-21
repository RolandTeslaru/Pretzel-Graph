import { toast } from "sonner"
import { Gateway } from "@pretzel-graph/shared/domain"
import { api } from "@/SDKs/ApiInterceptorSDK"
import type { GatewaySDKImpl } from "./sdk"

export type _GatewaySDKActions = {
    definition: {
        list: () => Promise<Gateway.Definition[]>
    }
    connection: {
        list:   () => Promise<Gateway.Connection[]>
        create: (req: Gateway.API.Connection.Create.Request) => Promise<Gateway.Connection>
        update: (req: Gateway.API.Connection.Update.Request) => Promise<Gateway.Connection>
        reconnect: (id: Gateway.Connection.Id) => Promise<Gateway.Connection>
        upsert: (connection: Gateway.Connection) => void
    }
}

export function _createGatewayActions_(sdk: GatewaySDKImpl): _GatewaySDKActions {
    const setState = sdk.useStore.setState

    const upsert = (connection: Gateway.Connection) => {
        setState(s => { s.connections[connection.id] = connection })
    }

    return {
        definition: {
            list: async () => {
                try {
                    const definitions = await Gateway.API.Definition.list(api)

                    setState(s => {
                        s.definitions = Object.fromEntries(definitions.map(d => [d.id, d])) as GatewaySDKImpl["state"]["definitions"]
                    })

                    return definitions
                } catch (err) {
                    console.error('GatewaySDK.definition.list failed', err)
                    toast.error('Failed to load connection types')
                    throw err
                }
            },
        },

        connection: {
            list: async () => {
                try {
                    const connections = await Gateway.API.Connection.list(api)

                    setState(s => {
                        s.connections = Object.fromEntries(connections.map(c => [c.id, c])) as GatewaySDKImpl["state"]["connections"]
                    })

                    return connections
                } catch (err) {
                    console.error('GatewaySDK.connection.list failed', err)
                    toast.error('Failed to load connections')
                    throw err
                }
            },

            create: async (req) => {
                try {
                    const connection = await Gateway.API.Connection.create(api, req)
                    upsert(connection)
                    return connection
                } catch (err) {
                    console.error('GatewaySDK.connection.create failed', err)
                    toast.error('Failed to create connection')
                    throw err
                }
            },

            update: async (req) => {
                try {
                    const connection = await Gateway.API.Connection.update(api, req)
                    upsert(connection)
                    return connection
                } catch (err) {
                    console.error('GatewaySDK.connection.update failed', err)
                    toast.error('Failed to update connection')
                    throw err
                }
            },

            reconnect: async (id) => {
                try {
                    const connection = await Gateway.API.Connection.reconnect(api, id)
                    upsert(connection)
                    return connection
                } catch (err) {
                    console.error('GatewaySDK.connection.reconnect failed', err)
                    toast.error('Failed to reconnect')
                    throw err
                }
            },

            upsert,
        },
    }
}
