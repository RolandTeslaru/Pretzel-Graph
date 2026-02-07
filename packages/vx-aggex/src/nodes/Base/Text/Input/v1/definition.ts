import { Foundations } from "@vx-agent-editor/shared/types";
import { InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Definition = {
    id: "Base.Text.Input.v1" as Foundations.NodeDefinition.Id,
    displayName: "Text Input",
    description: "This node is a text input",
    inputs: {
        text: InputBuilder.String({
            displayName: "Text",
            initialValue: "",
            placeholder: "Type anything...",
            hasHandle: true,
        })
    },
    outputs: {
        output: OutputBuilder.Message({
            displayName: "Output Text",
            tooltip: "The output text",
        })
    }
} as const satisfies Foundations.NodeDefinition