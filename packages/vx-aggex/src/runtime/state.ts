import { Chat, ExecutionSession, Orchestrator, Workflow } from "@vx-agent-editor/shared/domain";
import { Emitter } from "src/event/emitter";
import { StreamController } from "src/StreamController";
import { produce, freeze, Draft } from "immer";
import { z } from "zod";
import { BaseMessage } from "@langchain/core/messages";

export interface RuntimeContext {
    streamController: StreamController;
    emit: Emitter;
    jobId: Orchestrator.Job.Id;
    workflowCache: Workflow.Cache;
    workflow: Workflow;
}

/**
 * Defines a reducer function for a specific state field.
 * Utilizing immer's Draft, you can either mutate the current value directly without returning,
 * OR return a brand new value to replace it entirely.
 */
export type StateReducer<T> = (current: Draft<T>, update: T) => T | void;

/**
 * Definition of the RuntimeState using Zod schemas and optional reducers.
 * If no reducer is specified, the default behavior is a complete overwrite (Last Value Wins).
 */

const nodeOutputsSchema = ExecutionSession.Schema.shape.node_outputs
const attachmentsSchema = ExecutionSession.Schema.shape.attachments
const metadataSchema = ExecutionSession.Schema.shape.metadata

export namespace RuntimeState {

    export interface Entry<T> {
        schema: z.ZodType<T, any, any>;
        default?: () => T;
        reducer?: StateReducer<T>;
    }


    export const Definition = {
        node_outputs: {
            schema: nodeOutputsSchema,
            default: () => ({}),
            reducer: (current, update) => {
                for (const [nodeId, output] of Object.entries(update)) {
                    current[nodeId as Workflow.Node.Id] = output;
                }
            }
        } satisfies Entry<z.infer<typeof nodeOutputsSchema>>,

        messages: {
            schema: z.custom<BaseMessage[]>(),
            default: () => [],
            reducer: (current, update) => {
                current.push(...update);
            }
        } satisfies Entry<BaseMessage[]>,

        attachments: {
            schema: attachmentsSchema,
            default: () => ({}),
            reducer: (current, update) => {
                for (const [key, value] of Object.entries(update)) {
                    current[key] = value;
                }
            }
        } satisfies Entry<z.infer<typeof attachmentsSchema>>,

        metadata: {
            schema: metadataSchema,
            default: () => ({}),
            reducer: (current, update) => {
                for (const [key, value] of Object.entries(update)) {
                    current[key] = value;
                }
            }
        } satisfies Entry<z.infer<typeof metadataSchema>>,

        chatId: {
            schema: Chat.Id,
            default: () => ("" as Chat.Id),
        } satisfies Entry<Chat.Id>,
    }
    export type Definition = typeof Definition

    export type Update = Partial<RuntimeState>;
}
export type RuntimeState = {
    [K in keyof typeof RuntimeState.Definition]: z.infer<typeof RuntimeState.Definition[K]["schema"]>;
};

/**
 * Stores and manages state updates cleanly explicitly validating incoming data against Zod schemas 
 * and routing updates through custom reducers strictly using immer.
 */
export class StateController {
    private state: RuntimeState;

    constructor(initialState?: RuntimeState.Update) {
        const defaultState: any = {};
        for (const [key, field] of Object.entries(RuntimeState.Definition)) {
            defaultState[key] = field.default ? field.default() : undefined;
        }

        this.state = freeze({
            ...defaultState,
            ...initialState
        }, true);
    }

    public get(): RuntimeState {
        return this.state;
    }

    public update(updates: RuntimeState.Update) {
        //  Validate updates with zod
        const validatedUpdates: any = {};
        
        for (const [key, value] of Object.entries(updates)) {
            const fieldKey = key as keyof typeof RuntimeState.Definition;
            const fieldDef = RuntimeState.Definition[fieldKey];

            if (fieldDef)
                validatedUpdates[fieldKey] = fieldDef.schema.parse(value);
        }

        // Apply reducers
        this.state = produce(this.state, (draft: RuntimeState) => {
            for (const [key, value] of Object.entries(validatedUpdates)) {
                const entryKey = key as keyof typeof RuntimeState.Definition;
                const entryDef =  RuntimeState.Definition[entryKey] as RuntimeState.Entry<any>;

                if (entryDef.reducer) {
                    // Pass the draft of the specific property directly into its custom reducer
                    const result = entryDef.reducer(draft[entryKey], value);

                    // If the reducer explicitly returned a solid entirely new object/primitive, replace it
                    if (result !== undefined)
                        draft[entryKey] = result;
                } else {
                    // Default behavior if no reducer is implemented: Override
                    // @ts-expect-error
                    draft[entryKey] = value;
                }
            }
        });
    }
}