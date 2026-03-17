type BaseProps<TId extends string> = {
    id: TId;
    displayName: string;
    tooltip?: string;
    placeholder?: string;
} & (
    | { internal?: false | undefined; required?: boolean }
    | { internal: true; required?: false }
)

const p1: BaseProps<"a"> = { id: "a", displayName: "A", required: true }; // OK
const p2: BaseProps<"a"> = { id: "a", displayName: "A", internal: true }; // OK
const p3: BaseProps<"a"> = { id: "a", displayName: "A", internal: false, required: true }; // OK
// const p4: BaseProps<"a"> = { id: "a", displayName: "A", internal: true, required: true }; // ERROR

function buildBase<TId extends string>(props: BaseProps<TId>) {
    return {
        id: props.id,
        required: props.required ?? false,
        internal: props.internal ?? false,
    }
}
const out1 = buildBase(p1);
console.log(out1);
