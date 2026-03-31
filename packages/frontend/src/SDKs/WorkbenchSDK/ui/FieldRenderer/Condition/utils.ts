import { Foundations } from '@vx-agent-editor/shared/domain'

export const operatorLabel = (op: Foundations.Field.Condition.Operator): string => {
    const labels: Record<string, string> = {
        exists: "exists",
        not_exists: "does not exist",
        is_empty: "is empty",
        is_not_empty: "is not empty",
        equals: "equals",
        not_equals: "not equals",
        contains: "contains",
        not_contains: "does not contain",
        starts_with: "starts with",
        not_starts_with: "does not start with",
        ends_with: "ends with",
        not_ends_with: "does not end with",
        matches_regex: "matches regex",
        not_matches_regex: "does not match regex",
        greater_than: "greater than",
        less_than: "less than",
        greater_than_or_equal: "≥",
        less_than_or_equal: "≤",
        after: "is after",
        before: "is before",
        after_or_equal: "is after or equal",
        before_or_equal: "is before or equal",
        is_true: "is true",
        is_false: "is false",
        length_equals: "length equals",
        length_not_equals: "length not equals",
        length_greater_than: "length greater than",
        length_less_than: "length less than",
        length_greater_than_or_equal: "length ≥",
        length_less_than_or_equal: "length ≤",
    }
    return labels[op] ?? op
}
