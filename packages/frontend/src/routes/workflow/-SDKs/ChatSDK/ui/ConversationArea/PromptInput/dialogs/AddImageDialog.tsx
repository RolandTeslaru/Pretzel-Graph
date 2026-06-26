import { useState, useCallback } from 'react'
import { Dialog, Button } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { DialogSDK } from '@/SDKs/DialogSDK'

interface Props extends DialogSDK.TemplateProps {}

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

const AddImageDialogContent: React.FC<Props> = () => {
    const [dragging, setDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)

    const validate = (f: File) => {
        if (!ACCEPTED_IMAGE_TYPES.includes(f.type)) {
            setError('Unsupported file type. Please upload a PNG, JPEG, GIF, WebP, or SVG.')
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

    return (
        <div className="p-3 flex flex-col gap-4">
            <Dialog.Header className="my-1">
                <Dialog.Title>Add Image</Dialog.Title>
                <Dialog.Description className="text-muted-foreground">
                    Drag and drop an image or click to browse.
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
                    accept={ACCEPTED_IMAGE_TYPES.join(',')}
                    className="sr-only"
                    onChange={onInputChange}
                />
                {file ? (
                    <div className="flex flex-col items-center gap-2">
                        <img
                            src={URL.createObjectURL(file)}
                            alt="Preview"
                            className="max-h-40 max-w-full rounded-md object-contain"
                        />
                        <span className="text-sm text-muted-foreground">{file.name}</span>
                    </div>
                ) : (
                    <>
                        <SystemIcons.Image className="size-10 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground text-center">
                            {dragging ? 'Drop image here' : 'Drop an image here, or click to browse'}
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
                    onClick={() => { /* TODO: attach image to message */ }}
                    className="ml-auto"
                >
                    Attach Image
                </Button>
            </Dialog.Footer>
        </div>
    )
}

export default AddImageDialogContent
