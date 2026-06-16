import { useEffect } from "react"
import { WorkbenchSDK } from "../sdk"

// True while focus is in something the browser edits natively (text fields, selects,
// contenteditable). Canvas shortcuts must defer to native behaviour there — e.g. Ctrl+Z
// stays text-undo inside an input rather than undoing the graph.
const isEditableTarget = (el: EventTarget | null): boolean => {
    if (!(el instanceof HTMLElement)) return false
    return el.isContentEditable
        || el.tagName === "INPUT"
        || el.tagName === "TEXTAREA"
        || el.tagName === "SELECT"
}

// Editor-wide canvas keybindings. Listens on window (so it works regardless of which
// pane is focused) but ignores events originating from editable elements.
export function useCanvasKeyBindings() {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return
            if (isEditableTarget(e.target)) return

            const key = e.key.toLowerCase()

            // Undo / Redo
            if (key === "z") {
                e.preventDefault()
                if (e.shiftKey) WorkbenchSDK.actions.temporal.redo()
                else WorkbenchSDK.actions.temporal.undo()
                return
            }
            if (key === "y") {
                e.preventDefault()
                WorkbenchSDK.actions.temporal.redo()
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])
}
