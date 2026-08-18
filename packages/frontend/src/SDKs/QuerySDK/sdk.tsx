import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import type { UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query"
import type { ReactNode } from "react";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";

@SDK("Query")
export class QuerySDKImpl {
    constructor() { }

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

export const QuerySDK = SDK.get<QuerySDKImpl>("Query")


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