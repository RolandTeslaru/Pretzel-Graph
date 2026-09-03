import {
    type ClipboardPayload,
    ClipboardPayloadSchema,
} from "@pretzel-graph/shared/domain/Workbench/Document";

export {
    type ClipboardPayload,
    ClipboardPayloadSchema,
    CLIPBOARD_KIND,
    CLIPBOARD_VERSION,
} from "@pretzel-graph/shared/domain/Workbench/Document";

export const writeClipboard = async (payload: ClipboardPayload): Promise<void> => {
    await navigator.clipboard.writeText(JSON.stringify(payload));
};

// Returns null for any non-pretzel / malformed clipboard contents so callers
// can no-op instead of throwing on arbitrary pasted text.
export const readClipboard = async (): Promise<ClipboardPayload | null> => {
    let text: string;
    try {
        text = await navigator.clipboard.readText();
    } catch {
        return null; // permission denied / not focused / unsupported
    }
    if (!text) return null;

    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch {
        return null;
    }

    const parsed = ClipboardPayloadSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
};
