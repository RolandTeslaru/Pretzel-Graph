import { RegisterNode } from "../../../services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { Runtime } from "../../../runtime";
import { Synthesizer } from "../../../synthesizer";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { InferFields, InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Runtime.State,
        fields: InferFields<typeof Blueprint>,
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const {
            provider,
            apiKey,
            maxOutputTokens, // Potentially used for internal model creation
        } = fields;

        const { systemPrompt, tools, input } = inputs;

        if (provider === "Google") {
            // Instantiate Google Model internally (mimicking Python provider creation)
            if (!apiKey) {
                throw new Error("API Key is required for Google provider.");
            }
            const llm = new ChatGoogleGenerativeAI({
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
        const sysPromptContent = Synthesizer.coerceMessage("system", systemPrompt).content;

        // OutputSchema logic removed as field is missing in blueprint


        const prompt = ChatPromptTemplate.fromMessages([
            ["system", sysPromptContent],
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
        // Chat History removed from inputs

        // 6. Execution
        const inputContent = Synthesizer.coerceMessage("human", input).content;
        const result = await executor.invoke({
            input: inputContent,
            chat_history: [],
        });

        return {
            response: new AIMessage(result.output)
        };
    }


}


