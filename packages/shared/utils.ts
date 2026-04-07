import { Expression, Foundations } from "./domain";

// Evaluates a preprocessed JS expression string.
// preprocess() inlines all port values as JSON literals, so the resulting
// code is self-contained — no live references escape into the expression.
function runExpression(code: string): unknown {
    return new Function(`return (${code})`)()
}

export const evaluateRule = (rule: Foundations.Field.Condition.Rule, inputs: Record<string, any>): boolean => {

    console.log("Evaluating rule", rule, "with inputs", inputs);

    const preprocessedLeftOperand = Expression.preprocess(rule.leftOperand, inputs);

    console.log("Preprocessed left operand:", preprocessedLeftOperand);

    const left = runExpression(preprocessedLeftOperand);

    // Shared operators — present on every dataType
    if (rule.operator === "exists") return left !== undefined && left !== null;
    if (rule.operator === "not_exists") return left === undefined || left === null;
    if (rule.operator === "is_empty") return left === "" || left === null || left === undefined || (Array.isArray(left) && left.length === 0);
    if (rule.operator === "is_not_empty") return left !== "" && left !== null && left !== undefined && !(Array.isArray(left) && left.length === 0);

    const right = rule.rightOperand != null
        ? runExpression(Expression.preprocess(rule.rightOperand, inputs))
        : undefined;

    switch (rule.dataType) {
        case "string": {
            const l = String(left);
            const r = String(right);
            switch (rule.operator) {
                case "equals": return l === r;
                case "not_equals": return l !== r;
                case "contains": return l.includes(r);
                case "not_contains": return !l.includes(r);
                case "starts_with": return l.startsWith(r);
                case "not_starts_with": return !l.startsWith(r);
                case "ends_with": return l.endsWith(r);
                case "not_ends_with": return !l.endsWith(r);
                case "matches_regex": return new RegExp(r).test(l);
                case "not_matches_regex": return !new RegExp(r).test(l);
            }
            throw new Error(`Unsupported operator "${rule.operator}" for string`);
        }
        case "number": {
            const l = Number(left);
            const r = Number(right);
            switch (rule.operator) {
                case "equals": return l === r;
                case "not_equals": return l !== r;
                case "greater_than": return l > r;
                case "less_than": return l < r;
                case "greater_than_or_equal": return l >= r;
                case "less_than_or_equal": return l <= r;
            }
            throw new Error(`Unsupported operator "${rule.operator}" for number`);
        }
        case "dateTime": {
            const l = new Date(left as string).getTime();
            const r = new Date(right as string).getTime();
            switch (rule.operator) {
                case "equals": return l === r;
                case "not_equals": return l !== r;
                case "after": return l > r;
                case "before": return l < r;
                case "after_or_equal": return l >= r;
                case "before_or_equal": return l <= r;
            }
            throw new Error(`Unsupported operator "${rule.operator}" for dateTime`);
        }
        case "boolean": {
            const l = Boolean(left);
            switch (rule.operator) {
                case "is_true": return l === true;
                case "is_false": return l === false;
                case "equals": return l === Boolean(right);
                case "not_equals": return l !== Boolean(right);
            }
            throw new Error(`Unsupported operator "${rule.operator}" for boolean`);
        }
        case "array": {
            const arr = Array.isArray(left) ? left as unknown[] : [];
            switch (rule.operator) {
                case "contains": return arr.includes(right);
                case "not_contains": return !arr.includes(right);
                case "length_equals": return arr.length === Number(right);
                case "length_not_equals": return arr.length !== Number(right);
                case "length_greater_than": return arr.length > Number(right);
                case "length_less_than": return arr.length < Number(right);
                case "length_greater_than_or_equal": return arr.length >= Number(right);
                case "length_less_than_or_equal": return arr.length <= Number(right);
            }
            throw new Error(`Unsupported operator "${rule.operator}" for array`);
        }
        case "object":
            // Object only supports shared operators, handled above
            throw new Error(`Unsupported operator "${rule.operator}" for object`);
    }
}



export function evaluateRuleGroup(
    condition: Foundations.Field.Condition.Value,
    ruleGroup: Foundations.Field.Condition.RuleGroup,
    inputs: any
): boolean {
    const { children, combinator } = ruleGroup;

    const evaluateChild = (id: string): boolean => {
        if (id in condition.groups)
            return evaluateRuleGroup(condition, condition.groups[id as Foundations.Field.Condition.RuleGroup.Id], inputs);
        if (id in condition.rules)
            return evaluateRule(condition.rules[id as Foundations.Field.Condition.Rule.Id], inputs);
        throw new Error(`Invalid condition: no group or rule with id ${id}`);
    };

    if (combinator === "AND")
        return children.every(id => evaluateChild(id));
    if (combinator === "OR")
        return children.some(id => evaluateChild(id));

    throw new Error(`Invalid combinator: ${combinator}`);
}

export function evaluateCondition(
    condition: Foundations.Field.Condition.Value,
    inputs: any
): boolean {
    return evaluateRuleGroup(condition, condition.groups[condition.rootId], inputs);
}