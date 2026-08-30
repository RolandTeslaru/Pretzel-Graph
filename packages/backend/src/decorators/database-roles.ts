import { DB } from '@/db';
import { NoResultError } from 'kysely';
import { SystemError, DatabaseError } from '@pretzel-graph/shared/domain';

// Which roles each method declared, keyed by method name, stored on the
// prototype so @DatabaseClass can find them.
const DECLARED = Symbol.for('pretzel.db.declared');

type Registry = Record<string, DB.Role[]>;

function registryOf(prototype: object): Registry {
    if (!Object.prototype.hasOwnProperty.call(prototype, DECLARED))
        Object.defineProperty(prototype, DECLARED, { value: {}, enumerable: false, configurable: true });

    return (prototype as Record<symbol, Registry>)[DECLARED];
}

/**
 * Declares which identities may reach this method, and enforces it twice.
 *
 * Compile time: `R` infers from the arguments and the method's first parameter
 * must accept a `DB.Transaction<R>`, so the decorator cannot permit a role the
 * signature doesn't handle.
 *
 * Runtime: reads the tag `asUser`/`asService` attached to the handle. Catches
 * what types can't — `as any`, and `DB.Opener`, where the role is erased.
 */
export function AllowedDatabaseRoles<R extends DB.Role>(...roles: R[]) {
    return <T extends (trx: DB.Transaction<R>, ...rest: never[]) => unknown>(
        target: object,
        key: string | symbol,
        descriptor: TypedPropertyDescriptor<T>,
    ): TypedPropertyDescriptor<T> => {
        registryOf(target)[String(key)] = roles;

        const original = descriptor.value as unknown as (...args: unknown[]) => unknown;

        descriptor.value = function (this: unknown, ...args: unknown[]) {
            const role = DB.roleOf(args[0]);

            if (!role)
                throw new SystemError(
                    SystemError.Code.INFRA_DATABASE_ERROR,
                    'Something went wrong',
                    { detail: `${String(key)} received a handle with no role tag — not from asUser/asService` },
                );

            if (!roles.includes(role as R))
                throw new SystemError(
                    SystemError.Code.INFRA_DATABASE_ERROR,
                    'Something went wrong',
                    { detail: `${String(key)} may not run as '${role}' (declares: ${roles.join(', ')})` },
                );

            return original.apply(this, args);
        } as unknown as T;

        return descriptor;
    };
}

// Raw pg errors carry table names, constraint names and rejected values. They
// never reach a client — every one becomes a DatabaseError with a generic
// message and the detail kept server-side. The SQLSTATEs worth distinguishing:
const SQLSTATE: Record<string, SystemError.Code> = {
    '42501': SystemError.Code.FORBIDDEN,   // RLS rejected the write
    '23505': SystemError.Code.CONFLICT,    // unique violation
    '23503': SystemError.Code.NOT_FOUND,   // FK — referenced row missing
    '23502': SystemError.Code.BAD_REQUEST, // not-null violation
    '22P02': SystemError.Code.BAD_REQUEST, // malformed input (bad uuid, etc.)
};

export function catchDatabaseErrors(fn: (...args: unknown[]) => unknown, operation: string) {
    return async function (this: unknown, ...args: unknown[]) {
        try {
            return await fn.apply(this, args);
        }
        catch (err) {
            if (err instanceof SystemError)
                throw err;

            // executeTakeFirstOrThrow found nothing. Under an RLS-scoped handle that means the
            // row does not exist or is not visible to this caller — a NOT_FOUND, not a server
            // fault. It carries no SQLSTATE, so it would otherwise fall through to a 500.
            if (err instanceof NoResultError)
                throw new SystemError(SystemError.Code.NOT_FOUND, 'Not found', { detail: `[${operation}] no result` });

            const sqlstate = (err as { code?: string }).code ?? '';
            const detail = err instanceof Error ? err.message : String(err);

            console.error(`Database error during ${operation}:`, err);

            throw new DatabaseError(
                SQLSTATE[sqlstate] ?? SystemError.Code.INFRA_DATABASE_ERROR,
                'Something went wrong',
                { detail: `[${operation}] ${detail}`, data: { operation, sqlstate } },
            );
        }
    };
}

/**
 * Marks a class as a data-access class. Two guarantees:
 *
 * 1. Every method declares its roles via @AllowedDatabaseRoles, or the class throws at
 *    import time — a forgotten declaration stops the app booting rather than
 *    going unchecked.
 * 2. Every method's driver errors are caught and re-thrown as DatabaseError,
 *    with the SQLSTATE mapped to a domain code. Applied here rather than per
 *    method so it cannot be forgotten.
 *
 * Methods prefixed with `_` are exempt from both — helpers that touch no database.
 */
export function DatabaseClass<T extends new (...args: never[]) => object>(ctor: T): T {
    const prototype = ctor.prototype as Record<string, unknown>;
    const declared = registryOf(ctor.prototype);

    const methods = Object.getOwnPropertyNames(prototype)
        .filter((name) => name !== 'constructor' && !name.startsWith('_'))
        .filter((name) => typeof prototype[name] === 'function');

    const missing = methods.filter((name) => !(name in declared));

    if (missing.length)
        throw new Error(`${ctor.name}: methods missing @AllowedDatabaseRoles — ${missing.join(', ')}`);

    for (const name of methods)
        prototype[name] = catchDatabaseErrors(
            prototype[name] as (...args: unknown[]) => unknown,
            `${ctor.name}.${name}`,
        );

    return ctor;
}
