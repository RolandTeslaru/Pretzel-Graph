import { RegisterNode } from "../../../../services/Catalogue/service";
import { Blueprint } from "./blueprint"
import { Workflow } from "@vx-agent-editor/shared/domain";
import { RuntimeNode, RuntimeState } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";
import { Synthesizer } from "src/synthesizer";
import { Chat } from "@vx-agent-editor/shared/domain";
import { AxiosService } from "src/axios";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(props: RuntimeNode.ConstructorProps) {
        super(props);
    }

    private responseMessageId: Chat.Message.Id | null = null;
    private chatId: Chat.Id | null = null;


    public override async init(props: RuntimeNode.InitProps) {
        const incomingEdges = props.workflowCache.incomingEdgesMap[this.workflowNode.id];
        const upstreamNodeId = Object.keys(incomingEdges)[0] as Workflow.Node.Id | undefined;

        const state = props.state;

        if (upstreamNodeId) {
            const chatId = state.chatId;

            if (!chatId)
                return;

            this.chatId = chatId;

            // Create the response message
            const responseMessage = {
                id: Chat.Message.createId(),
                role: "ai",
                content: "",
                job_id: props.jobId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                chat_id: chatId!,
                data: {
                    isProcessing: true,
                    tool_calls: []
                }
            } satisfies Chat.Message.Assistant

            this.responseMessageId = responseMessage.id;

            await Chat.API.Message.respond(AxiosService.api, { responseMessage })
            console.log("Created response message with id ", responseMessage.id, " for chat ", chatId)


            this.emit({
                type: "response:created",
                topic: Chat.Event.getTopic(chatId),
                responseMessage,
                chatId
            } satisfies Chat.Event.ResponseCreated)


            // Listen and emit chunks as they come from the LLM
            state.streamController.onLlmChunk(upstreamNodeId, (content) => {
                this.emit({
                    type: "response:chunk",
                    topic: Chat.Event.getTopic(chatId),
                    chatId,
                    responseMessageId: responseMessage.id,
                    content
                } satisfies Chat.Event.ResponseChunk)
            } )
        }
    }

    public override async run(
        state: RuntimeState,
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { input } = inputs;

        state.messages.push(Synthesizer.coerceMessage("ai", input));

        const rawContent = input.content;
        const content = typeof rawContent === "string"
            ? rawContent
            : rawContent
                .map(b => typeof b === "string" ? b : ("text" in b ? b.text : ""))
                .join("");


        if(this.responseMessageId && this.chatId){
            this.emit({
                type:              "response:finished",
                topic:             Chat.Event.getTopic(this.chatId!),
                responseMessageId: this.responseMessageId!,
                finalContent:      content,
                chatId:            this.chatId!,
            } satisfies Chat.Event.ResponseFinished)

            await Chat.API.Message.update(AxiosService.api, {
                messageId: this.responseMessageId,
                content
            })
        }


        state.streamController.disposeLlmCallbacks(this.workflowNode.id);
        return {};
    }
}