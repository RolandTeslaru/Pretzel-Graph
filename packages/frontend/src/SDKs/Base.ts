import type { StoreApi, UseBoundStore } from "zustand"

export abstract class BaseSDK<T_State> {
    protected constructor() { }

    public abstract readonly useStore: BaseSDK.Store<T_State>

    public get state() { return this.useStore.getState() }
    public get subscribe() { return this.useStore.subscribe }
    public get setState() { return this.useStore.setState }
}

export namespace BaseSDK {
    export type Store<T> = UseBoundStore<StoreApi<T>> & {
        setState: {
            (nextStateOrUpdater: T | Partial<T> | ((state: T) => void), shouldReplace?: false | undefined): void;
            (nextStateOrUpdater: T | ((state: T) => void), shouldReplace: true): void;
        }
    }
}