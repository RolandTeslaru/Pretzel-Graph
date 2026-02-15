import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { Runtime } from "src/runtime";
import { Synthesizer } from "src/synthesizer";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Runtime.State,
        fields: Runtime.InferFields<typeof Blueprint>,
        inputs: Runtime.InferInputs<typeof Blueprint>
    ): Promise<Runtime.InferOutputs<typeof Blueprint>> {

        const {
            systemPrompt,
            agentLlm,
            apiKey,
            addCurrentDateTool,
            maxOutputTokens, // Potentially used for internal model creation
            outputSchema
        } = fields;

        const { tools, input, chatHistory } = inputs;

        // 1. Resolve Language Model
        let llm: BaseChatModel;

        if (agentLlm === "Google") {
            // Instantiate Google Model internally (mimicking Python provider creation)
            if (!apiKey) {
                throw new Error("API Key is required for Google provider.");
            }
            llm = new ChatGoogleGenerativeAI({
                model: '',
                apiKey: apiKey,
                maxOutputTokens: maxOutputTokens > 0 ? maxOutputTokens : undefined,
            });
        } else {
            // "Connect other models" - In the Python version this dynamically updates the build config to show a node input
            // Since we removed the explicit input as requested, this path is currently invalid without the dynamic field update mechanism
            throw new Error("To use 'Connect other models', this node requires dynamic field updates which are not yet implemented. Please use 'Google' provider.");
        }

        if (!llm.bindTools) {
            throw new Error("The provided language model does not support tool binding (bindTools method missing).");
        }

        // 2. Resolve Tools
        const toolsArray = Array.isArray(tools) ? tools : (tools ? [tools] : []);


        // 3. Prepare Prompt
        // If outputSchema is present, we might need to append instructions to systemPrompt
        // (Python code does this for structured output)
        let finalSystemPrompt = systemPrompt;
        if (outputSchema && Array.isArray(outputSchema) && outputSchema.length > 0) {
            // Simple appending of schema instructions if present
            // In a real implementation, we'd use a structured output parser or tool
            finalSystemPrompt += `\n\nOutput must follow this schema: ${JSON.stringify(outputSchema)}`;
        }

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", finalSystemPrompt],
            new MessagesPlaceholder("chat_history"),
            ["human", "{input}"],
            new MessagesPlaceholder("agent_scratchpad"),
        ]);

        // 4. Create Agent & Executor
        const agent = await createToolCallingAgent({
            llm,
            tools: toolsArray,
            prompt,
        });

        const executor = new AgentExecutor({
            agent,
            tools: toolsArray,
        });

        // 5. Prepare Inputs
        let historyMessages: any[] = [];
        if (Array.isArray(chatHistory)) {
            historyMessages = chatHistory;
        } else if (chatHistory) {
            historyMessages = [chatHistory];
        }

        // 6. Execution
        const inputContent = Synthesizer.coerceMessage("human", input).content;
        const result = await executor.invoke({
            input: inputContent,
            chat_history: historyMessages,
        });

        return {
            response: new AIMessage(result.output)
        };
    }

    public static override async onReconcile(
        changedFieldId: Foundations.Field.Id,
        newValue: Foundations.Field.Value,
        currentBlueprint: Foundations.Blueprint
    ): Promise<typeof Blueprint> {
        return Promise.resolve(currentBlueprint as typeof Blueprint);
    }
}


