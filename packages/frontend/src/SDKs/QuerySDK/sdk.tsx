import { QueryClient, QueryClientProvider, useMutation, UseMutationOptions, UseMutationResult, useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { ReactNode } from "react";

export class _QuerySDK_ {
    private constructor() { }

    public static readonly instance = new _QuerySDK_();

    public readonly client = new QueryClient();


    public useQuery: QuerySDK.UseQuery = (
        queryKey,
        queryFn,
        options = {},
    ) => {
        return useQuery({
            queryKey,
            queryFn,
            retry: 5,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            ...options,
        });
    }


    public useMutation: QuerySDK.UseMutation = (
        mutationKey,
        mutationFn,
        options = {},
    ) => {
        return useMutation({
            
            mutationKey,
            mutationFn,
            onSettled: (data, error, variables, onMutateResult, context) => {
                this.client.invalidateQueries({ queryKey: mutationKey });
                options.onSettled && options.onSettled(data, error, variables, onMutateResult, context);
            },
            ...options,
            retry: options.retry ?? 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        });
    }

    public Provider = ({ children }: { children: ReactNode }) => {
        return (
            <QueryClientProvider client={this.client}>
                {children}
            </QueryClientProvider>
        )
    }
}

export const QuerySDK = _QuerySDK_.instance


export namespace QuerySDK {
    export type UseQuery = <
        TQueryFnData = unknown, 
        TError = unknown, 
        TData = TQueryFnData
    >(
        queryKey: UseQueryOptions["queryKey"],
        
        queryFn: UseQueryOptions<TQueryFnData, TError, TData>["queryFn"],
        
        options?: Omit<UseQueryOptions<TQueryFnData, TError, TData>, "queryKey" | "queryFn">,
    ) => UseQueryResult<TData, TError>;

    export type UseMutation = <
        TData = unknown, 
        TError = unknown, 
        TVariables = void, 
        TContext = any
    >(
        mutationKey: UseMutationOptions["mutationKey"],
        
        mutationFn: UseMutationOptions<TData, TError, TVariables, TContext>["mutationFn"],
        
        options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn" | "mutationKey">,
    ) => UseMutationResult<TData, TError, TVariables, TContext>;
}