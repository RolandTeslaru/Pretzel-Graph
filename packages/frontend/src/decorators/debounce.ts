interface DebounceOptions {
    leading?: boolean;
    trailing?: boolean;
}

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delayMs: number,
    options: DebounceOptions = { trailing: true }
): T {
    let timeoutId: any;
    let called = false;

    const debounced = function (this: any, ...args: any[]) {
        const context = this;

        if (options.leading && !called) {
            called = true;
            func.apply(context, args);
        }

        clearTimeout(timeoutId);

        timeoutId = setTimeout(() => {
            called = false;
            if (options.trailing) {
                func.apply(context, args);
            }
        }, delayMs);
    } as any;

    return debounced;
}

export function Debounce(
    delayMs: number,
    options: DebounceOptions = { trailing: true }
) {
    return function (
        _target: object,
        _key: string | symbol,
        descriptor: PropertyDescriptor
    ): PropertyDescriptor {
        const original = descriptor.value;
        descriptor.value = debounce(original, delayMs, options);
        return descriptor;
    };
}