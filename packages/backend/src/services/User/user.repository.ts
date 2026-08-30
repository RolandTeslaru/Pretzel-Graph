import { Injectable } from '@nestjs/common';
import { Auth } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '../../decorators/database';

@Injectable()
export class UserRepository extends Repository {

    @Transactional('user')
    @ZodReturn(Auth.User.Schema)
    public async getMe(principal: Principal.User): Promise<Auth.User> {
        const row = await this.trx
            .selectFrom('users')
            .selectAll()
            .where('id', '=', principal.userId)
            .executeTakeFirstOrThrow();

        return DB.User.toDomain(row);
    }

    // Only display_name and username are settable — the column grant on public.users
    // permits exactly these two, so anything else here would fail with 42501.
    @Transactional('user')
    @ZodReturn(Auth.User.Schema)
    public async updateMe(principal: Principal.User, payload: Auth.API.Me.Update.Request): Promise<Auth.User> {
        const row = await this.trx
            .updateTable('users')
            .set({
                display_name: payload.display_name,
                username: payload.username,
            })
            .where('id', '=', principal.userId)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.User.toDomain(row);
    }

    /** Whether anyone owns this deployment yet. */
    @Transactional('service')
    public async getDeploymentClaim(principal: Principal.Service): Promise<{ claimed_at: string | null } | undefined> {
        return this.trx
            .selectFrom('deployment')
            .select('claimed_at')
            .executeTakeFirst();
    }
}
