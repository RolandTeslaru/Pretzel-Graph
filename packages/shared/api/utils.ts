import { z } from "zod";

export const createApiResponse = <T extends z.ZodTypeAny>(dataSchema: T) => 
  z.object({
    status: z.number(),
    statusText: z.string(),
    data: dataSchema,
  });