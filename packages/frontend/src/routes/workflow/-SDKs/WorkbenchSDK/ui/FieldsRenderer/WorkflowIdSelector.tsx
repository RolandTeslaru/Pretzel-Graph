import { memo } from 'react'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import { WorkflowIllustration } from '@pretzel-graph/standard-ui/icons/illustrations'
import { Workflow } from '@pretzel-graph/shared/domain'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import { WithExpression } from './withExpression'

export const WorkflowIdSelectorField = memo<RendererProps<'WorkflowIdSelector'>>(({ field, nodeId, className }) => {

    const [value, onChange, flush, issue, isExpression] = WorkbenchSDK.useField<string>(nodeId, field)

    const meta = LibrarySDK.useStore(s => value && !isExpression ? s.workflowMetas[value as Workflow.Id] : undefined)

    const accent = meta?.icon_color ?? meta?.accent

    const iconColor = accent ? `var(--${accent})` : 'var(--primary)'
    const backgroundColor = accent ? `color-mix(in srgb, var(--${accent}) 25%, transparent)` : 'var(--muted)'

    const errorClass = issue ? 'border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50' : ''

    const setValue = (workflowId: string) =>
        WorkbenchSDK.actions.field.setValue(nodeId, field, workflowId)

    const expressionProps = {
        value: String(value ?? ''),
        isExpression,
        onToggleExpression: (val: boolean) => WorkbenchSDK.actions.field.setIsExpression(nodeId, field.id, val),
        onChange: (val: string) => onChange(val),
        onCommit: flush,
        nodeId,
        displayName: field.displayName,
        reconcile: field.reconcile,
        only: field.only,
        itemScoped: field.itemScoped,
        className: cn(className, 'w-full nodrag cursor-auto flex flex-col gap-2'),
    }

    return (
        <WithExpression {...expressionProps}>
            <FieldLabel field={field} />
            {isExpression ?
                <WithExpression.Input className={errorClass} />
            :
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn('h-auto bg-card/80! min-h-7 w-full px-2 py-1 text-left', errorClass)}
                    onClick={() => LibrarySDK.dialogs.openResourceSelector({
                        accept: 'workflow',
                        initialFolderId: LibrarySDK.selectors.folderOf(WorkbenchSDK.document.workflowId),
                        onSelect: (r) => setValue(r.id),
                    })}
                >
                    <span className="flex min-w-0 items-center gap-2 mr-auto">
                        <span
                            className="flex size-5 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor }}
                        >
                            {meta?.icon ? (
                                <IconRenderer name={meta.icon} className="size-3" style={{ color: iconColor }} />
                            ) : (
                                <WorkflowIllustration className="size-3" style={{ color: iconColor }} />
                            )}
                        </span>
                        <span className="truncate text-xs font-medium">
                            {meta?.display_name || (value ? value : field.placeholder || 'Select workflow')}
                        </span>
                    </span>

                    {value && (
                        <span
                            role="button"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={(event) => {
                                event.stopPropagation()
                                setValue('')
                            }}
                        >
                            <SystemIcons.X className="size-3" />
                        </span>
                    )}
                    <SystemIcons.ChevronDown />
                </Button>
            }
        </WithExpression>
    )
})
WorkflowIdSelectorField.displayName = 'WorkflowIdSelectorField'
