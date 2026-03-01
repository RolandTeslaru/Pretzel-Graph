import { CompiledStateGraph } from "@langchain/langgraph";
import { RuntimeState } from "./state";

export type CompiledGraph = CompiledStateGraph<
    RuntimeState,
    typeof RuntimeState.Schema.Update,
    string,
    typeof RuntimeState.Schema,
    typeof RuntimeState.Schema
>
