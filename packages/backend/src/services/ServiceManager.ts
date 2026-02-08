import { singleton, container } from "tsyringe";

const serviceRegistry = new Map<string, any>();

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
function createSerivceDecorator(name: string) {
    return function <T extends new (...args: any[]) => any>(target: T) {
        singleton()(target);

        if (serviceRegistry.has(name))
            console.warn(`[SDK] Overwriting SDK: ${name}`);

        serviceRegistry.set(name, target);

        return target;
    };
}

// Attach utility methods to the decorator function
createSerivceDecorator.get = function <T>(name: string): T {
    const SDKClass = serviceRegistry.get(name);

    if (!SDKClass)
        throw new Error(`[SDK] SDK "${name}" is not registered. Did you forget to import it?`);
   
    return container.resolve(SDKClass) as T;
};

createSerivceDecorator.has = function (name: string): boolean {
    return serviceRegistry.has(name);
};

createSerivceDecorator.list = function (): string[] {
    return Array.from(serviceRegistry.keys());
};

createSerivceDecorator.getClass = function <T>(name: string): T | undefined {
    return serviceRegistry.get(name);
};

export const Service = createSerivceDecorator;
