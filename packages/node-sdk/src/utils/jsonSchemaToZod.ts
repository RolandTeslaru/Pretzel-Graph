import { z } from "zod/v3";

/**
 * Minimal JSON-Schema → Zod for tool-arg shapes (objects of primitives/enums/arrays).
 * Built with the same `zod/v3` import the rest of the nodes use, so the schema is the
 * instance `tool()` validates against — no cross-zod-version `instanceof` mismatch.
 *
 * Anything it does not model (oneOf/anyOf/$ref/…) degrades to `z.any()`, which validates
 * but gives the model no guidance — worth extending as third-party schemas demand it.
 */
export function jsonSchemaToZod(schema: any): z.ZodTypeAny {
    if (!schema || typeof schema !== "object")
        return z.any();

    switch (schema.type) {
        case "string":
            return Array.isArray(schema.enum) && schema.enum.length
                ? z.enum(schema.enum as [string, ...string[]])
                : z.string();
        case "number":
            return z.number();
        case "integer":
            return z.number().int();
        case "boolean":
            return z.boolean();
        case "array":
            return z.array(jsonSchemaToZod(schema.items ?? {}));
        case "object": {
            const required = new Set<string>(schema.required ?? []);
            const shape: Record<string, z.ZodTypeAny> = {};
            for (const [key, raw] of Object.entries(schema.properties ?? {})) {
                let field = jsonSchemaToZod(raw);
                const description = (raw as any)?.description;
                if (description)
                    field = field.describe(description);
                shape[key] = required.has(key) ? field : field.optional();
            }
            return z.object(shape);
        }
        default:
            return z.any();
    }
}
