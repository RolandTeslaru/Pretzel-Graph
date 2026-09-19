import { Assistant, Chat, Execution, SystemError, Validation, Workbench, Workflow } from "@pretzel-graph/shared/domain";
import { DialogSDK } from "@pretzel-graph/standard-ui/SDKs/DialogSDK";
import { toast } from "sonner";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { router } from "@/main";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";
import { deriveChatName } from "../ChatSDK/actions";
import type { AssistantSDKImpl } from "./sdk";
import FullscreenAssistant from "./ui/Fullscreen";

export function createAssistantSDKActions(sdk: AssistantSDKImpl) {
    return {
        message: {
            upsert: (message) => sdk.setState(s => sdk.reducers.upsertMessage(s, message)),

            send: async ({ content }) => {
                if (sdk.state.executionId || sdk.state.setupStatus !== "ready")
                    return

                const chatId  = sdk.state.currentChatId
                const message: Chat.Message.Human = {
                    id:      Chat.Message.createId(),
                    role:    "human",
                    content,
                }

                try {
                    if (!sdk.state.currentChat) {
                        const { chat } = await Chat.API.ensure(api, Assistant.WORKFLOW_ID, { chatId, name: deriveChatName(content) })

                        sdk.setState(s => { s.currentChat = chat })
                        void sdk.invalidate(sdk.query.threads())
                    }

                    sdk.actions.message.upsert(message)

                    // The assistant edits the saved workflow, so pending edits must land first.
                    await WorkbenchSDK.actions.commit()

                    if (WorkbenchSDK.document.isDirty)
                        throw new Error("Could not save the workflow before asking the assistant.")

                    const context: Assistant.Context = { workflowId: WorkbenchSDK.document.workflowId }
                    const executionId = Execution.createId()

                    sdk.followExecution(executionId)

                    await Execution.API.run(api, Assistant.WORKFLOW_ID, {
                        executionId,
                        igniter: {
                            variant: "chat_message",
                            chat_id: chatId,
                            message,
                            inputs:  { [Assistant.CONTEXT_PORT_ID]: context },
                        },
                    })
                }
                catch (err) {
                    sdk.unfollowExecution()
                    toast.error(SystemError.messageFrom(err))
                    console.error("Failed to send message to the assistant", err)
                }
            },

            stop: async () => {
                const executionId = sdk.state.executionId

                if (!executionId)
                    return

                const { success } = await Execution.API.terminate(api, executionId)

                if (!success)
                    toast.error("Failed to stop the assistant")
            },
        },

        thread: {
            list: async () => {
                const { chats } = await Chat.API.listByWorkflow(api, Assistant.WORKFLOW_ID)

                return chats
            },

            load: async (chatId) => {
                sdk.setState(s => {
                    s.currentChatId = chatId
                    s.currentChat   = null
                    s.isLoading     = true
                    sdk.reducers.resetMessages(s)
                })

                try {
                    const { chat, messages } = await Chat.API.get(api, chatId)

                    sdk.setState(s => {
                        s.currentChat = chat
                        messages.forEach(m => sdk.reducers.upsertMessage(s, m))
                        s.isLoading = false
                    })
                }
                catch (err) {
                    sdk.setState(s => { s.isLoading = false })
                    toast.error(SystemError.messageFrom(err))
                    console.error("Failed to load assistant thread", err)
                }
            },

            new: () => sdk.setState(s => {
                s.currentChatId = Chat.createId()
                s.currentChat   = null
                sdk.reducers.resetMessages(s)
            }),

            erase: async (chatId) => {
                try {
                    await Chat.API.erase(api, chatId)

                    if (sdk.state.currentChatId === chatId)
                        sdk.actions.thread.new()

                    void sdk.invalidate(sdk.query.threads())
                }
                catch (err) {
                    toast.error(SystemError.messageFrom(err))
                    console.error("Failed to delete assistant thread", err)
                }
            },
        },

        setup: {
            // Ready once the assistant workflow passes the same validation a run does.
            check: async () => {
                sdk.setState(s => { s.setupStatus = "checking" })

                try {
                    const { workflow, blueprints, repairs } = await Workbench.API.Workflow.get(api, { workflowId: Assistant.WORKFLOW_ID })

                    const data     = Workflow.Repair.applyAll(workflow.data, repairs).data
                    const document = Workbench.Document.create(Assistant.WORKFLOW_ID, data, blueprints)

                    Workbench.Document.withCyclesRecompute(d => d.reducers.workflow.validate(d))(document)

                    const isReady = !Validation.workflowHasIssues(document.issues)

                    sdk.setState(s => { s.setupStatus = isReady ? "ready" : "incomplete" })
                }
                catch (err) {
                    sdk.setState(s => { s.setupStatus = "incomplete" })
                    console.error("Failed to check the assistant workflow", err)
                }
            },

            open: () => {
                if (DialogSDK.state.dialogs.has("fullscreen-assistant"))
                    DialogSDK.actions.pop("fullscreen-assistant")

                sdk.actions.ui.setSidebarVisibility(false)

                void router.navigate({ to: '/workflow/$workflowid', params: { workflowid: Assistant.WORKFLOW_ID } })
            },
        },

        ui: {
            setSidebarVisibility: (show) => sdk.setState(s => {
                s.isSidebarVisible = show
            }),
            toggleSidebar: () => sdk.setState(s => {
                s.isSidebarVisible = !s.isSidebarVisible
            }),
            openFullscreen: () => {
                DialogSDK.actions.push("fullscreen-assistant", (props) => (
                    <FullscreenAssistant {...props} />
                ))

                setTimeout(() => {
                    sdk.actions.ui.setSidebarVisibility(false)
                }, 500)
            },
            closeFullscreen: () => {
                DialogSDK.actions.pop("fullscreen-assistant")
                sdk.actions.ui.setSidebarVisibility(true)
            },
        },
    } satisfies AssistantSDKActions
}

export interface AssistantSDKActions {
    message: {
        upsert: (message: Chat.Message) => void
        send:   (props: { content: string }) => Promise<void>
        stop:   () => Promise<void>
    }
    thread: {
        list:  () => Promise<Chat[]>
        load:  (chatId: Chat.Id) => Promise<void>
        new:   () => void
        erase: (chatId: Chat.Id) => Promise<void>
    }
    setup: {
        check: () => Promise<void>
        open:  () => void
    }
    ui: {
        setSidebarVisibility: (show: boolean) => void
        toggleSidebar:        () => void
        openFullscreen:       () => void
        closeFullscreen:      () => void
    }
}
