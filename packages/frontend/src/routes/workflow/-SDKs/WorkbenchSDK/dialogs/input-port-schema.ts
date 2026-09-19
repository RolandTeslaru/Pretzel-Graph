import { z } from 'zod'
import type { Port } from '@pretzel-graph/shared/domain/Foundations/Port'

export const INPUT_PORT_VARIANTS = [
    'Message', 'MessageList', 'Text', 'Data', 'DataList',
    'Document', 'LanguageModel', 'Embeddings', 'VectorStore',
    'Retriever', 'Tool', 'ToolList', 'Skill', 'SkillList', 'DataFrame',
] as const satisfies readonly Port.Variant[]

export const inputPortSchema = z.object({
    id: z.string().trim().min(1, 'ID is required'),
    displayName: z.string().trim().min(1, 'Name is required'),
    variant: z.enum(INPUT_PORT_VARIANTS, { message: 'Please select a type' }),
    required: z.boolean(),
})
export type InputPortValues = z.infer<typeof inputPortSchema>
