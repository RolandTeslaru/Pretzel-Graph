import { createContext, useContext } from 'react'

export type Accent = "Message" | "LanguageModel"

export const ACCENT_BUTTON_VARIANT = {
    Message:       "message",
    LanguageModel: "language-model",
} as const satisfies Record<Accent, string>

export interface ConversationState {
    accent:    Accent
    // The AI is working on a reply; no new message can be sent until it settles.
    isRunning: boolean
    onStop?:   () => void
    // Sending is blocked, e.g. the workflow has issues; the prompt stays editable.
    isSendBtnDisabled: boolean
}

export const ConversationContext = createContext<ConversationState>({ accent: "Message", isRunning: false, isSendBtnDisabled: false })

export const useConversation = () => useContext(ConversationContext)

export const PromptContext = createContext<{ canSend: boolean, disabled: boolean }>({ canSend: false, disabled: false })

// Whether the surrounding prompt is disabled; for extra buttons in its bottom row.
export const usePromptInput = () => useContext(PromptContext)
