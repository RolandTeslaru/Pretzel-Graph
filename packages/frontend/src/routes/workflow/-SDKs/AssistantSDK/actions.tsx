import { Assistant } from "@pretzel-graph/shared/domain";
import { DialogSDK } from "@/SDKs/DialogSDK";
import type { AssistantSDKImpl } from "./sdk";
import FullscreenAssistant from "./ui/FullscreenAssistant";

export function createAssistantSDKActions(sdk: AssistantSDKImpl) {
    return {
        message: {
            upsert: (message) => sdk.setState(s => sdk.reducers.upsertMessage(s, message)),
            appendContent: (messageId, content) =>
                sdk.setState(s => sdk.reducers.appendContent(s, messageId, content)),
            setContent: (messageId, content) => sdk.setState(s => {
                const msg = s.messagesRecord[messageId];
                if (msg) msg.content = content;
            }),
            finaliseStreaming: (messageId) => sdk.setState(s => {
                const msg = s.messagesRecord[messageId] as Assistant.Message.AI | undefined;
                if (msg) msg.data.isProcessing = false;
            }),
            send: async ({ content }) => {
                const assistantId = sdk.state.currentAssistantId;

                const humanMessage: Assistant.Message.Human = {
                    id: Assistant.Message.createId(),
                    assistant_id: assistantId,
                    role: "human",
                    content,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                sdk.actions.message.upsert(humanMessage);

                // TODO: wire up to the assistant backend / streaming endpoint.
                const aiMessage: Assistant.Message.AI = {
                    id: Assistant.Message.createId(),
                    assistant_id: assistantId,
                    role: "ai",
                    content: "",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    data: { isProcessing: true },
                };
                sdk.actions.message.upsert(aiMessage);
            },
        },

        thread: {
            new: () => sdk.setState(s => {
                s.currentAssistantId = Assistant.createId();
                s.messages = [];
                s.messagesRecord = {};
            }),
            clear: () => sdk.setState(s => {
                s.messages = [];
                s.messagesRecord = {};
            }),
            select: (assistantId) => sdk.setState(s => {
                // TODO: load messages for the selected assistant from the backend.
                s.currentAssistantId = assistantId;
                s.messages = [];
                s.messagesRecord = {};
            }),
            erase: (assistantId) => sdk.setState(s => {
                // TODO: erase the assistant on the backend.
                delete s.assistants[assistantId];
                if (s.currentAssistantId === assistantId) {
                    s.currentAssistantId = Assistant.createId();
                    s.messages = [];
                    s.messagesRecord = {};
                }
            }),
        },

        ui: {
            setSidebarVisibility: (show: boolean) => sdk.setState(s => {
                s.isSidebarVisible = show;
            }),
            toggleSidebar: () => sdk.setState(s => {
                s.isSidebarVisible = !s.isSidebarVisible;
            }),
            openFullscreen: () => {
                DialogSDK.actions.push("fullscreen-assistant", (props) => (
                    <DialogSDK.UnstyledTemplate {...props}>
                        <FullscreenAssistant blockTransparency={props.blockTransparency} surfaceStyle={props.surfaceStyle} />
                    </DialogSDK.UnstyledTemplate>
                ))

                setTimeout(() => {
                    sdk.actions.ui.setSidebarVisibility(false);
                }, 500)
            },
            closeFullscreen: () => {
                DialogSDK.actions.pop("fullscreen-assistant");
                sdk.actions.ui.setSidebarVisibility(true);
            },
        },
    } satisfies AssistantSDKActions;
}

export interface AssistantSDKActions {
    message: {
        upsert: (message: Assistant.Message) => void
        appendContent: (messageId: Assistant.Message.Id, content: string) => void
        setContent: (messageId: Assistant.Message.Id, content: string) => void
        finaliseStreaming: (messageId: Assistant.Message.Id) => void
        send: (props: { content: string }) => Promise<void>
    }
    thread: {
        new: () => void
        clear: () => void
        select: (assistantId: Assistant.Id) => void
        erase: (assistantId: Assistant.Id) => void
    }
    ui: {
        setSidebarVisibility: (show: boolean) => void
        toggleSidebar: () => void
        openFullscreen: () => void
        closeFullscreen: () => void
    }
}
