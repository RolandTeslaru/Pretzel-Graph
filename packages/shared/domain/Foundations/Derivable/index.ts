import { z } from "zod"
import { Field } from "../Field"
import { Vault } from "../../Vault"


// Anything whose field values decide the rest of its shape: a base, plus a tree of conditional
// branches folded against those values.
export namespace Derivable {

    // Members a branch can contribute to. Extensions (a blueprint's ports) fold their own on top.
    export const MEMBERS = ["fields", "credentials"] as const
    export type  Member  = typeof MEMBERS[number]

    // Equality only. Relational operators would make the matched set non-exhaustive, which the
    // path-based identity depends on.
    export const OPERATORS = ["==", "!="] as const
    export type  Operator  = typeof OPERATORS[number]

    // Segments of a derivative id: "auth==bearer/format==json"
    export const SEPARATOR = "/"

    export const DerivativeId = z.string().brand("DerivativeId")
    export type  DerivativeId = z.infer<typeof DerivativeId>


    export type Condition = {
        readonly fieldId:  Field.Id
        readonly operator: Operator
        readonly value:    Field.Value
    }

    export namespace Condition {
        export const Schema = z.object({
            fieldId:  Field.Id,
            operator: z.enum(OPERATORS),
            value:    z.any(),
        })

        // "  auth == bearer " -> { fieldId: "auth", operator: "==", value: "bearer" }
        const KEY_PATTERN = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(==|!=)\s*(.+?)\s*$/

        export const parseKey = (key: string): { fieldId: string; operator: Operator; value: string } | null => {
            const match = KEY_PATTERN.exec(key)

            if (!match)
                return null

            return {
                fieldId:  match[1],
                operator: match[2] as Operator,
                value:    match[3],
            }
        }

        export const formatToken = (condition: Condition): string =>
            `${condition.fieldId}${condition.operator}${String(condition.value)}`

        export const matches = (condition: Condition, current: Field.Value | undefined): boolean => {
            const equal = current === condition.value

            return condition.operator === "==" ? equal : !equal
        }
    }


    // One conditional contribution. Extensions add their own members alongside these.
    export interface Branch {
        readonly condition:     Condition
        readonly fields?:       readonly Field[]
        readonly credentials?:  readonly Vault.Credential.Template[]
        // Members this branch replaces instead of appending to; settled after the walk.
        readonly replaces?:     readonly string[]
        // When it matches, its siblings at this level do not apply.
        readonly exclusive?:    boolean
        readonly _derivatives?: readonly Branch[]
    }

    export namespace Branch {
        // Everything but the recursion, so extensions can add members before closing the tree.
        export const Base = z.object({
            condition:    Condition.Schema,
            fields:       z.array(Field.Schema).readonly().optional(),
            credentials:  z.array(Vault.Credential.Template.Schema).readonly().optional(),
            replaces:     z.array(z.string()).readonly().optional(),
            exclusive:    z.boolean().optional(),
        })

        export const Schema: z.ZodType<Branch> = z.lazy(() => Base.extend({
            _derivatives: z.array(Schema).readonly().optional(),
        })) as unknown as z.ZodType<Branch>
    }


    export const Schema = z.object({
        id:           z.string(),
        fields:       z.array(Field.Schema).readonly(),
        credentials:  z.array(Vault.Credential.Template.Schema).readonly().optional(),
        // Folded by derive; absent on a derived result, so nothing is derived twice.
        _derivatives: z.array(Branch.Schema).readonly().optional(),
    })


    export class PathNotFoundError extends Error {
        public override readonly name = "DerivablePathNotFoundError"

        constructor(
            public readonly derivableId:   string,
            public readonly missingTokens: readonly string[],
        ) {
            super(`deriveByPath(${derivableId}): no branch matching ${missingTokens.map(token => `"${token}"`).join(", ")}`)
        }
    }


    export const isDerivable = (derivable: Derivable): boolean =>
        (derivable._derivatives?.length ?? 0) > 0


    type Bucket = Record<string, unknown[]>

    // What a walk collected: base plus appending branches, replacing contributions kept apart.
    export type Fold = {
        readonly appended:  Bucket
        readonly replacing: Bucket
        readonly replaced:  Set<string>
        readonly path:      string[]
    }

    const seed = (base: Derivable, members: readonly string[]): Fold => {
        const appended:  Bucket = {}
        const replacing: Bucket = {}

        for (const member of members) {
            appended[member]  = [...(((base as Record<string, unknown>)[member] as unknown[] | undefined) ?? [])]
            replacing[member] = []
        }

        return { appended, replacing, replaced: new Set(), path: [] }
    }

    const contribute = (fold: Fold, branch: Branch, members: readonly string[]) => {
        for (const member of members) {
            const items = ((branch as unknown as Record<string, unknown>)[member] as unknown[] | undefined) ?? []

            if (branch.replaces?.includes(member)) {
                // Recorded even when empty; "replace with nothing" is a legitimate instruction.
                fold.replaced.add(member)
                fold.replacing[member].push(...items)
                continue
            }

            fold.appended[member].push(...items)
        }
    }

    // A replaced member takes only the replacing contributions, whatever order the branches sat in.
    export const resolve = (fold: Fold, member: string): unknown[] =>
        fold.replaced.has(member)
            ? fold.replacing[member]
            : fold.appended[member]


    /**
     * Walks the branch tree against field values and collects what every matched branch
     * contributes to `members`. A condition falls back to its field's initialValue, so an empty
     * record walks the default variant. `onMatch` sees each matched branch in walk order, for
     * contributions that override rather than accumulate.
     */
    export const fold = (
        base:        Derivable,
        fieldValues: Partial<Record<Field.Id, Field.Value>>,
        members:     readonly string[] = MEMBERS,
        onMatch?:    (branch: Branch) => void,
    ): Fold => {
        const folded = seed(base, members)

        const walk = (branches: readonly Branch[] | undefined) => {
            // The whole level is matched before anything contributes, so an exclusive branch wins
            // wherever it sits among its siblings.
            const matched = (branches ?? []).filter(branch => {
                const { fieldId } = branch.condition

                // The compiler guarantees the field is declared at or above this level, and parents
                // contribute before we recurse, so this lookup cannot miss.
                const declared = [...folded.appended.fields, ...folded.replacing.fields]
                    .find(field => (field as Field).id === fieldId) as Field | undefined

                return Condition.matches(branch.condition, fieldValues[fieldId] ?? declared?.initialValue)
            })

            const exclusive = matched.find(branch => branch.exclusive)

            for (const branch of exclusive ? [exclusive] : matched) {
                contribute(folded, branch, members)
                onMatch?.(branch)
                folded.path.push(Condition.formatToken(branch.condition))

                walk(branch._derivatives)
            }
        }

        walk(base._derivatives)

        return folded
    }


    /**
     * Replays a known derivative id without the field values that produced it. The id is a set
     * of matched tokens, so this takes any branch whose token is in the set and recurses only
     * into the ones it took. Tokens nothing claimed are returned for extensions to settle.
     */
    export const foldByPath = (
        base:         Derivable,
        derivativeId: DerivativeId | string,
        members:      readonly string[] = MEMBERS,
        onMatch?:     (branch: Branch) => void,
    ): { fold: Fold; unclaimed: string[] } => {
        const folded = seed(base, members)
        const wanted = new Set(String(derivativeId).split(SEPARATOR).filter(Boolean))

        const walk = (branches: readonly Branch[] | undefined) => {
            for (const branch of branches ?? []) {
                const token = Condition.formatToken(branch.condition)

                if (!wanted.has(token))
                    continue

                contribute(folded, branch, members)
                onMatch?.(branch)
                folded.path.push(token)

                walk(branch._derivatives)
            }
        }

        walk(base._derivatives)

        const claimed = new Set(folded.path)

        return { fold: folded, unclaimed: [...wanted].filter(token => !claimed.has(token)) }
    }


    // Derived variants, memoized per base object and keyed by the sorted matched-token set, so
    // identical derivations return the same object and a re-fetched base gets a fresh slot.
    const variantCache = new WeakMap<Derivable, Map<string, Derivable>>()

    const assemble = <T extends Derivable>(base: T, folded: Fold): T => {
        const key = [...folded.path].sort().join(SEPARATOR)

        let variants = variantCache.get(base)

        if (!variants) {
            variants = new Map()
            variantCache.set(base, variants)
        }

        let variant = variants.get(key) as T | undefined

        if (!variant) {
            const { _derivatives, ...rest } = base

            variant = {
                ...rest,
                fields:      resolve(folded, "fields"),
                credentials: resolve(folded, "credentials"),
            } as unknown as T

            variants.set(key, variant)
        }

        return variant
    }


    // Folds a base against field values; the result carries no branches and cannot be derived again.
    export const derive = <T extends Derivable>(
        base:        T,
        fieldValues: Partial<Record<Field.Id, Field.Value>>,
    ): { derived: T; derivativeId: DerivativeId | null } => {
        const folded = fold(base, fieldValues)

        return {
            derived:      assemble(base, folded),
            derivativeId: folded.path.length ? folded.path.join(SEPARATOR) as DerivativeId : null,
        }
    }


    export const deriveByPath = <T extends Derivable>(base: T, derivativeId: DerivativeId | string): T => {
        const { fold: folded, unclaimed } = foldByPath(base, derivativeId)

        if (unclaimed.length)
            throw new PathNotFoundError(base.id, unclaimed)

        return assemble(base, folded)
    }
}
export type Derivable = z.infer<typeof Derivable.Schema>
