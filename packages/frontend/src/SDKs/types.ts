import { StoreApi, UseBoundStore } from "zustand"

// Use overloaded signature to match Immer's setState behavior
export type SDKStore<T> = UseBoundStore<StoreApi<T>> & {
    setState: {
        (nextStateOrUpdater: T | Partial<T> | ((state: T) => void), shouldReplace?: false | undefined): void;
        (nextStateOrUpdater: T | ((state: T) => void), shouldReplace: true): void;
    }
}

export type DropFirstArg<F> =
  F extends (first: any, ...rest: infer R) => infer Ret
    ? (...args: R) => Ret
    : never;