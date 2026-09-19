import { Assistant, Chat } from "@pretzel-graph/shared/domain";
import { DialogSDK } from "@pretzel-graph/standard-ui/SDKs/DialogSDK";
import type { AssistantSDKImpl } from "./sdk";
import FullscreenAssistant from "./ui/Fullscreen";

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
                const msg = s.messagesRecord[messageId] as Chat.Message.AI | undefined;
                if (msg) msg.data.isProcessing = false;
            }),
            send: async ({ content }) => {
                const humanMessage: Chat.Message.Human = {
                    id: Chat.Message.createId(),
                    role: "human",
                    content,
                };
                sdk.actions.message.upsert(humanMessage);

                // TODO: wire up to the assistant backend / streaming endpoint.
                const aiMessage: Chat.Message.AI = {
                    id: Chat.Message.createId(),
                    role: "ai",
                    content: "",
                    data: { isProcessing: true },
                };
                sdk.actions.message.upsert(aiMessage);
            },
        },

        thread: {
            new: () => sdk.setState(s => {
                s.currentAssistantId = Assistant.createId();
                sdk.reducers.resetMessages(s);
            }),
            clear: () => sdk.setState(s => {
                sdk.reducers.resetMessages(s);
            }),
            select: (assistantId) => sdk.setState(s => {
                // TODO: load messages for the selected assistant from the backend.
                s.currentAssistantId = assistantId;
                sdk.reducers.resetMessages(s);
            }),
            erase: (assistantId) => sdk.setState(s => {
                // TODO: erase the assistant on the backend.
                delete s.assistants[assistantId];
                if (s.currentAssistantId === assistantId) {
                    s.currentAssistantId = Assistant.createId();
                    sdk.reducers.resetMessages(s);
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
                    <FullscreenAssistant {...props} />
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
        upsert: (message: Chat.Message) => void
        appendContent: (messageId: Chat.Message.Id, content: string) => void
        setContent: (messageId: Chat.Message.Id, content: string) => void
        finaliseStreaming: (messageId: Chat.Message.Id) => void
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
