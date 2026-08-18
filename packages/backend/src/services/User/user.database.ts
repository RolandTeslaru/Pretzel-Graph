import { Injectable } from '@nestjs/common';
import { Auth } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { ZodReturn } from '../../decorators/database';
import { AllowedDatabaseRoles, DatabaseClass } from '../../decorators/database-roles';

@Injectable()
@DatabaseClass
export class UserDatabase {

    @AllowedDatabaseRoles("user")
    @ZodReturn(Auth.User.Schema)
    async getMe(trx: DB.UserTransaction, userId: Auth.User.Id): Promise<Auth.User> {
        const row = await trx
            .selectFrom('users')
            .selectAll()
            .where('id', '=', userId)
            .executeTakeFirstOrThrow();

        return DB.User.toDomain(row);
    }

    // Only display_name and username are settable — the column grant on public.users
    // permits exactly these two, so anything else here would fail with 42501.
    @AllowedDatabaseRoles("user")
    @ZodReturn(Auth.User.Schema)
    async updateMe(
        trx: DB.UserTransaction,
        userId: Auth.User.Id,
        payload: Auth.API.Me.Update.Request,
    ): Promise<Auth.User> {
        const row = await trx
            .updateTable('users')
            .set({
                display_name: payload.display_name,
                username: payload.username,
            })
            .where('id', '=', userId)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.User.toDomain(row);
    }
}
