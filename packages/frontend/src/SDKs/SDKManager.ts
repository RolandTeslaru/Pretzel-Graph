import { singleton, container } from "tsyringe";

// Registry: Maps SDK name -> Class Constructor
const sdkRegistry = new Map<string, any>();

/**
 * SDK - Decorator + Manager
 * 
 * Use as a decorator: @SDK("Workbench")
 * Use to retrieve:    SDK.get<WorkbenchSDK>("Workbench")
 * 
 * Example:
 * ```typescript
 * @SDK("Workbench")
 * export class WorkbenchSDKImpl extends BaseSDK<State> { ... }
 * 
 * // Anywhere else:
 * const sdk = SDK.get<WorkbenchSDKImpl>("Workbench");
 * ```
 */
function createSDKDecorator(name: string) {
    return function <T extends new (...args: any[]) => any>(target: T) {
        // Apply singleton behavior
        singleton()(target);

        // Register in our central registry
        if (sdkRegistry.has(name)) {
            console.warn(`[SDK] Overwriting SDK: ${name}`);
        }
        sdkRegistry.set(name, target);

        return target;
    };
}

// Attach utility methods to the decorator function
createSDKDecorator.get = function <T>(name: string): T {
    const SDKClass = sdkRegistry.get(name);
    if (!SDKClass) {
        throw new Error(`[SDK] SDK "${name}" is not registered. Did you forget to import it?`);
    }
    return container.resolve(SDKClass) as T;
};

createSDKDecorator.has = function (name: string): boolean {
    return sdkRegistry.has(name);
};

createSDKDecorator.list = function (): string[] {
    return Array.from(sdkRegistry.keys());
};

createSDKDecorator.getClass = function <T>(name: string): T | undefined {
    return sdkRegistry.get(name);
};

// Export as SDK
export const SDK = createSDKDecorator;
