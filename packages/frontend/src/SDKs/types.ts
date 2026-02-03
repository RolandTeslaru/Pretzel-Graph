export type DropFirstArg<F> =
  F extends (first: any, ...rest: infer R) => infer Ret
    ? (...args: R) => Ret
    : never;