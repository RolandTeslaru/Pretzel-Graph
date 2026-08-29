import { z } from 'zod';

// Supabase returns timestamps in non-standard format:
// "2026-05-22 13:47:12.123456+00" (space instead of T, offset missing :MM)
// This preprocesses to ISO 8601 before Zod validates.
export const supabaseTimestamp = z.preprocess(
    (v) => {
        if (typeof v !== 'string') return v;
        return v.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
    },
    z.iso.datetime({ offset: true }),
);

/** Every key on any member of a union, rather than only the shared ones. */
type KeyOfUnion<T> = T extends unknown ? keyof T : never;

type OmitFromOption<T_Option, T_Keys extends PropertyKey> =
    T_Option extends z.ZodObject<infer T_Shape>
        ? z.ZodObject<Omit<T_Shape, T_Keys>>
        : T_Option;

type OmitFromOptions<T_Options extends readonly unknown[], T_Keys extends PropertyKey> =
    { -readonly [I in keyof T_Options]: OmitFromOption<T_Options[I], T_Keys> };

/**
 * A discriminated union with `keys` dropped from every member, for reusing one
 * domain's union as another's without the payloads it does not carry.
 *
 * `.omit()` is a ZodObject method, so the options are stripped and the union is
 * rebuilt. Two details make it work: a member that lacks a key is passed through,
 * since Zod throws when omitting a key that is not in the shape; and the options
 * are mapped as a *tuple*, which is what keeps every variant narrowing on its own
 * discriminant instead of widening to the union of all stripped shapes.
 */
export function omitFromUnion<
    T_Union extends z.ZodDiscriminatedUnion,
    const T_Keys extends readonly (KeyOfUnion<z.infer<T_Union>> & string)[],
>(union: T_Union, keys: T_Keys) {

    const options = union.options.map((option) => {
        const object = option as z.ZodObject;
        const mask = Object.fromEntries(
            keys.filter((key) => key in object.shape).map((key) => [key, true as const]),
        );

        return Object.keys(mask).length === 0 ? object : object.omit(mask as never);
    });

    return z.discriminatedUnion(union.def.discriminator, options as never) as unknown as
        z.ZodDiscriminatedUnion<OmitFromOptions<T_Union['options'], T_Keys[number]>>;
}
