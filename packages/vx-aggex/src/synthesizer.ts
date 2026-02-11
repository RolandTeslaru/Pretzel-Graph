import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { LC } from "./langchain";
import { Foundations } from "@vx-agent-editor/shared/types";

export class Synthesizer {

    public static createLC(input: Foundations.Input){
        switch(input.variant){
            case "message":
                return new HumanMessage(input)
        }
    }

    public static ensureMessage(kind: "human" | "system" | "ai", input: LC.BaseMessage | string): LC.BaseMessage {
        const content = typeof input === "string" ? input : input.content;

        switch (kind) {
            case "system":
                return input instanceof SystemMessage ? input : new SystemMessage(content);
            case "human":
                return input instanceof HumanMessage ? input : new HumanMessage(content);
            case "ai":
                return input instanceof AIMessage ? input : new AIMessage(content);
        }
    }
}