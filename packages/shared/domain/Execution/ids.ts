import z from "zod"

export const ExecutionId = z.uuid().brand("ExecutionId")
export type ExecutionId = z.infer<typeof ExecutionId>
export const createId = () => crypto.randomUUID() as ExecutionId
