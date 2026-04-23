import { useState, useCallback } from 'react'
import { Dialog, Button } from '@pretzel-graph/vx-ui/foundations'
import { SystemIcons } from '@pretzel-graph/vx-ui/icons'
import type { DialogSDK } from '@/SDKs/DialogSDK'

interface Props extends DialogSDK.TemplateProps {}

const MAX_FILE_SIZE_MB = 20

const AddFileDialogContent: React.FC<Props> = () => {
    const [dragging, setDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)

    const validate = (f: File) => {
        if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            setError(`File exceeds the ${MAX_FILE_SIZE_MB} MB limit.`)
            return false
        }
        setError(null)
        return true
    }

    const handleFile = (f: File) => {
        if (validate(f)) setFile(f)
    }

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragging(true)
    }, [])

    const onDragLeave = useCallback(() => setDragging(false), [])

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragging(false)
        const dropped = e.dataTransfer.files[0]
        if (dropped) handleFile(dropped)
    }, [])

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0]
        if (selected) handleFile(selected)
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div className="p-3 flex flex-col gap-4">
            <Dialog.Header className="my-1">
                <Dialog.Title>Add File</Dialog.Title>
                <Dialog.Description className="text-muted-foreground">
                    Drag and drop a file or click to browse. Max {MAX_FILE_SIZE_MB} MB.
                </Dialog.Description>
            </Dialog.Header>

            <label
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`
                    flex flex-col items-center justify-center gap-3
                    border-2 border-dashed rounded-lg p-10 cursor-pointer
                    transition-colors
                    ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40'}
                `}
            >
                <input
                    type="file"
                    className="sr-only"
                    onChange={onInputChange}
                />
                {file ? (
                    <div className="flex flex-row items-center gap-3 rounded-md bg-muted px-4 py-3 w-full">
                        <SystemIcons.File className="size-8 shrink-0 text-muted-foreground" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <SystemIcons.File className="size-10 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground text-center">
                            {dragging ? 'Drop file here' : 'Drop a file here, or click to browse'}
                        </span>
                    </>
                )}
            </label>

            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}

            <Dialog.Footer>
                <Button
                    type="button"
                    disabled={!file}
                    onClick={() => { /* TODO: attach file to message */ }}
                    className="ml-auto"
                >
                    Attach File
                </Button>
            </Dialog.Footer>
        </div>
    )
}

export default AddFileDialogContent
