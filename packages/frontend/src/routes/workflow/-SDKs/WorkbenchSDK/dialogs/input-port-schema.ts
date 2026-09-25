import { z } from 'zod'
import type { Port } from '@pretzel-graph/shared/domain/Foundations/Port'
import { Workbench } from '@pretzel-graph/shared/domain'

export const INPUT_PORT_VARIANTS = [
    'Message', 'MessageList', 'Text', 'Data', 'DataList',
    'Document', 'LanguageModel', 'Embeddings', 'VectorStore',
    'Retriever', 'Tool', 'ToolList', 'Skill', 'SkillList', 'DataFrame',
] as const satisfies readonly Port.Variant[]

export const inputPortSchema = z.object({
    id: z.string().trim().min(1, 'ID is required').regex(Workbench.ID_PATTERN, 'Letters, digits and underscores only'),
    displayName: z.string().trim().min(1, 'Name is required'),
    variant: z.enum(INPUT_PORT_VARIANTS, { message: 'Please select a type' }),
    required: z.boolean(),
})
export type InputPortValues = z.infer<typeof inputPortSchema>
