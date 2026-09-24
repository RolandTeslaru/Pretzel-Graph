import type { Gateway, Vault } from "@pretzel-graph/shared/domain";
import type { InferCredential, InferFieldValues } from "../types";
import { HostContext } from "../contexts";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { SocketContext } from '../contexts/socket';

export abstract class GatewaySocket<

    T_Definition extends Gateway.Definition

> {
    // The definition's fields joined against the connection row's stored values.
    public readonly fieldValues: InferFieldValues<T_Definition>;

    // The credential instance bound to this connection.
    public readonly credential: InferCredential<T_Definition>;

    public readonly connection: Gateway.Connection

    constructor (
        protected readonly ctx: SocketContext
    ){
        this.fieldValues = ctx.connection.fieldValues as InferFieldValues<T_Definition>
        this.credential  = ctx.connection.credential as InferCredential<T_Definition>
        this.connection  = ctx.connection
    }

    public abstract connect(): Promise<void>

    // The instance is discarded afterwards; the next connect builds a new one.
    public abstract disconnect(): Promise<void>

    protected abstract dispatchEvent(...args: any): void
}


export namespace GatewaySocket {
    export interface Context extends SocketContext {}
    export type Constructor = ConstructorParameters<typeof GatewaySocket>[0]
}