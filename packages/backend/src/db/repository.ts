import { AsyncLocalStorage } from 'node:async_hooks';
import { SystemError } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { catchDatabaseErrors } from '@/decorators/database-roles';

type Kind = Principal['type'];

type PrincipalOf<K extends Kind> = Extract<Principal, { type: K }>;

const transactionStorage = new AsyncLocalStorage<{ trx: unknown }>();

/** Base class for data-access classes whose methods run under @Transactional. */
export abstract class Repository {

    /** The transaction the current @Transactional call opened. */
    protected get trx(): DB.Transaction<DB.Role> {
        const store = transactionStorage.getStore();

        if (!store)
            throw new SystemError(
                SystemError.Code.INFRA_DATABASE_ERROR,
                'Something went wrong',
                { detail: 'No open transaction — is the method missing @Transactional?' },
            );

        return store.trx as DB.Transaction<DB.Role>;
    }
}

/**
 * Opens a transaction as the principal in the method's first argument, checked
 * against `accepted` at compile time and at runtime. Nested calls throw —
 * compose inside one repository method, using `_`-prefixed helpers.
 */
export function Transactional<K extends [Kind, ...Kind[]]>(...accepted: K) {
    return function <M extends (principal: PrincipalOf<K[number]>, ...rest: never[]) => Promise<unknown>>(
        target: object,
        key: string | symbol,
        descriptor: TypedPropertyDescriptor<M>,
    ): void {
        const original = descriptor.value;

        if (!original)
            throw new Error(`@Transactional(${accepted.join(', ')}) must decorate a method`);

        const operation = `${(target.constructor as { name: string }).name}.${String(key)}`;

        const wrapped = async function (this: object, ...args: unknown[]): Promise<unknown> {
            const [principal, ...rest] = args as [Principal, ...unknown[]];

            if (!accepted.includes(principal.type))
                throw new SystemError(
                    SystemError.Code.INFRA_DATABASE_ERROR,
                    'Something went wrong',
                    { detail: `${operation} may not run as '${principal.type}' (accepts: ${accepted.join(', ')})` },
                );

            if (transactionStorage.getStore())
                throw new SystemError(
                    SystemError.Code.INFRA_DATABASE_ERROR,
                    'Something went wrong',
                    { detail: `${operation} would nest transactions — compose inside one repository method` },
                );

            const run = (trx: DB.Transaction<DB.Role>): Promise<unknown> =>
                transactionStorage.run({ trx }, () => original.apply(this, [principal, ...rest] as Parameters<M>));

            switch (principal.type) {
                case 'user':
                    return DB.asUser(principal, run);
                case 'delegate':
                    return DB.asDelegate(principal, run);
                case 'service':
                    return DB.asService(operation, run);
            }
        };

        descriptor.value = catchDatabaseErrors(wrapped, operation) as unknown as M;
    };
}
