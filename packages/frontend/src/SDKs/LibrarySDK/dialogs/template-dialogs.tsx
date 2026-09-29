import { useState } from 'react'
import { Badge, Button, Dialog, Frame, Spinner, Tooltip } from '@pretzel-graph/standard-ui/foundations'
import { Card } from '@pretzel-graph/standard-ui/foundations/card'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import { WorkflowIllustration } from '@pretzel-graph/standard-ui/icons/illustrations'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import type { Library, Template } from '@pretzel-graph/shared/domain'
import { TEMPLATE_CATEGORIES, type TemplateCategory, type TemplateCategoryId } from '@pretzel-graph/shared/constants/templateCategories'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { router } from '@/main'
import { LibrarySDK } from '../sdk'
import { openCreateWorkflowDialog } from './workflow-dialogs'

// Every integration blueprint id starts with this.
const INTEGRATION_BLUEPRINT_ID_PREFIX = 'Integrations.'

// Icons shown on a template card before the rest collapse into a +n.
const MAX_CARD_ICONS = 5

const ICON_CHIP = 'relative flex shrink-0 items-center justify-center size-7 rounded-full border bg-muted text-foreground'

// The sidebar entry that shows every template.
const ALL_TEMPLATES = 'all'

type Selection = TemplateCategoryId | typeof ALL_TEMPLATES

type SidebarSection = {
    title: string | null
    categories: TemplateCategory[]
}

export function openTemplateGalleryDialog(args: { folder_id: Library.Folder.Id }) {
    const id = `template-gallery-${args.folder_id}`
    DialogSDK.actions.push(id, (props) => (
        <TemplateGallery dialogProps={props} dialogId={id} {...args} />
    ))
}

function colorOf(token: string | null) {
    return token ? `var(--${token})` : 'var(--primary)'
}

// Categories that hold at least one template, grouped by section in sidebar order.
function getSidebarSections(templates: Template[]): SidebarSection[] {
    const usedCategoryIds = new Set(templates.flatMap((template) => template.categoryIds))
    const sectionsByTitle = new Map<string | null, SidebarSection>([[null, { title: null, categories: [] }]])

    for (const category of Object.values(TEMPLATE_CATEGORIES)) {
        if (!usedCategoryIds.has(category.id))
            continue

        const section = sectionsByTitle.get(category.section) ?? { title: category.section, categories: [] }

        section.categories.push(category)

        sectionsByTitle.set(category.section, section)
    }

    return [...sectionsByTitle.values()]
}

// One entry per distinct node icon, integrations first, naming every node that shares it.
function getTemplateIcons(template: Template) {
    const iconsByName = new Map<string, { icon: string; color: string | null; names: string[] }>()

    const blueprintMetas = Object.values(template.blueprintMetas)

    const orderedBlueprintMetas = [
        ...blueprintMetas.filter((blueprintMeta) => blueprintMeta.id.startsWith(INTEGRATION_BLUEPRINT_ID_PREFIX)),
        ...blueprintMetas.filter((blueprintMeta) => !blueprintMeta.id.startsWith(INTEGRATION_BLUEPRINT_ID_PREFIX)),
    ]

    for (const blueprintMeta of orderedBlueprintMetas) {
        const { icon, iconColor, accent, displayName } = blueprintMeta.ui
        const entry = iconsByName.get(icon) ?? { icon, color: iconColor ?? accent ?? null, names: [] }

        entry.names.push(displayName)

        iconsByName.set(icon, entry)
    }

    return [...iconsByName.values()]
}

interface TemplateGalleryProps {
    dialogProps: DialogSDK.TemplateProps
    dialogId: string
    folder_id: Library.Folder.Id
}

function TemplateGallery({ dialogProps, dialogId, folder_id }: TemplateGalleryProps) {
    const [templates, [request]] = LibrarySDK.useWith(
        (s) => s.templates,
        (q) => [q.templates],
    )

    const [pickedSelection, setPickedSelection] = useState<Selection | null>(null)

    const sortedTemplates = Object.values(templates).sort((a, b) => a.sortOrder - b.sortOrder)

    const [topSection, ...sections] = getSidebarSections(sortedTemplates)

    const selection = pickedSelection ?? topSection.categories[0]?.id ?? ALL_TEMPLATES

    const selectedCategory = selection === ALL_TEMPLATES ? null : TEMPLATE_CATEGORIES[selection]

    const visibleTemplates = selectedCategory
        ? sortedTemplates.filter((template) => template.categoryIds.includes(selectedCategory.id))
        : sortedTemplates

    const onRemix = (template: Template) => {
        openCreateWorkflowDialog({
            folder_id,
            template,
            onCreated: (workflow) => {
                DialogSDK.actions.pop(dialogId)
                void router.navigate({ to: '/workflow/$workflowid', params: { workflowid: workflow.id } })
            },
        })
    }

    const onBlank = () => {
        openCreateWorkflowDialog({ folder_id, onCreated: () => DialogSDK.actions.pop(dialogId) })
    }

    return (
        <DialogSDK.SplitTemplate {...dialogProps}
            className='w-[960px] max-w-[95vw] h-[600px] max-h-[85vh]'
            sidebarClassName='w-[220px] px-4! shrink-0 overflow-y-auto'
            contentClassName='min-w-0 p-0!'
            sidebarRenderer={() => (
                <nav className='flex flex-col gap-1'>
                    <h2 className='pb-2 text-base font-medium'>Templates</h2>
                    {topSection.categories.map((category) => (
                        <SidebarEntry
                            key={category.id}
                            icon={category.icon}
                            label={category.label}
                            active={selection === category.id}
                            onClick={() => setPickedSelection(category.id)}
                        />
                    ))}
                    <SidebarEntry
                        icon='Layers'
                        label='All templates'
                        active={selection === ALL_TEMPLATES}
                        onClick={() => setPickedSelection(ALL_TEMPLATES)}
                    />
                    {sections.map((section) => (
                        <div key={section.title} className='flex flex-col gap-1 pt-4'>
                            <p className='px-2 pb-1 text-xs text-muted-foreground'>{section.title}</p>
                            {section.categories.map((category) => (
                                <SidebarEntry
                                    key={category.id}
                                    icon={category.icon}
                                    label={category.label}
                                    active={selection === category.id}
                                    onClick={() => setPickedSelection(category.id)}
                                />
                            ))}
                        </div>
                    ))}
                </nav>
            )}
        >
            <div className='relative h-full w-full min-w-0'>
                <Dialog.FloatingHeader title={selectedCategory?.label ?? 'All templates'}>
                    <span className='text-xs text-muted-foreground'>Start from a copy of a published workflow.</span>
                </Dialog.FloatingHeader>

                <Dialog.MaskedScrollArea className='h-full'>
                    {request.isPending && sortedTemplates.length === 0 ? (
                        <div className='flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground'>
                            <Spinner className='size-3.5' />
                            Loading templates…
                        </div>
                    ) : sortedTemplates.length === 0 ? (
                        <p className='py-16 text-center text-sm text-muted-foreground'>No templates are available.</p>
                    ) : (
                        <div className='grid grid-cols-2 gap-3'>
                            {visibleTemplates.map((template) => (
                                <TemplateCard
                                    key={template.listingId}
                                    template={template}
                                    onClick={() => onRemix(template)}
                                />
                            ))}
                        </div>
                    )}
                </Dialog.MaskedScrollArea>

                <Dialog.FloatingFooter>
                    <Button variant="default" onClick={onBlank}>
                        <SystemIcons.Plus />
                        Blank workflow
                    </Button>
                </Dialog.FloatingFooter>
            </div>
        </DialogSDK.SplitTemplate>
    )
}

function SidebarEntry({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type='button'
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
            )}
        >
            <IconRenderer name={icon} className='size-4 shrink-0' />
            <span className='truncate'>{label}</span>
        </button>
    )
}

function TemplateCard({ template, onClick }: { template: Template; onClick: () => void }) {
    const templateIcons = getTemplateIcons(template)
    const visibleIcons = templateIcons.slice(0, MAX_CARD_ICONS)
    const hiddenIcons = templateIcons.slice(MAX_CARD_ICONS)

    return (
        <Frame.Root className='w-full overflow-hidden'>
            <Frame.Panel
                className='h-[120px] flex flex-col transition-shadow p-0 pt-3 pb-2 cursor-pointer'
                onClick={onClick}
            >
                <Card.Header>
                    <div className='flex flex-row items-center gap-2 min-w-0'>
                        {template.icon ? (
                            <IconRenderer name={template.icon} className='size-6 shrink-0' style={{ color: colorOf(template.iconColor ?? template.accent) }} />
                        ) : (
                            <WorkflowIllustration className='size-6 shrink-0' style={{ color: 'var(--primary)' }} />
                        )}
                        <Card.Title className='text-sm truncate'>{template.name}</Card.Title>
                    </div>
                </Card.Header>
                {template.description && (
                    <Card.Content className='mt-2'>
                        <p className='line-clamp-2 text-xs text-muted-foreground'>{template.description}</p>
                    </Card.Content>
                )}
            </Frame.Panel>
            <Frame.Footer className='flex flex-row items-center gap-2 px-2! py-1! w-full h-[38px]'>
                <div className='flex flex-row items-center -space-x-1 min-w-0'>
                    {visibleIcons.map((templateIcon) => (
                        <Tooltip.Root key={templateIcon.icon}>
                            <Tooltip.Trigger className={ICON_CHIP}>
                                <IconRenderer name={templateIcon.icon} className='size-4' />
                            </Tooltip.Trigger>
                            <Tooltip.Content>
                                {templateIcon.names.join(', ')}
                            </Tooltip.Content>
                        </Tooltip.Root>
                    ))}
                    {hiddenIcons.length > 0 && (
                        <Tooltip.Root>
                            <Tooltip.Trigger className={cn(ICON_CHIP, 'text-[10px] font-medium')}>
                                +{hiddenIcons.length}
                            </Tooltip.Trigger>
                            <Tooltip.Content>
                                {hiddenIcons.flatMap((templateIcon) => templateIcon.names).join(', ')}
                            </Tooltip.Content>
                        </Tooltip.Root>
                    )}
                </div>
                <Badge variant='success' size='sm' className='ml-auto'>{template.versionName}</Badge>
            </Frame.Footer>
        </Frame.Root>
    )
}
