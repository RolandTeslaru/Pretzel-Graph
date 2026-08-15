import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Auth } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { AuthDatabase } from './auth.database';

@Injectable()
export class AuthService {
    constructor(private readonly database: AuthDatabase) {}

    /** Whether anyone owns this deployment yet. Public — it gates the first-run screen. */
    public async getStatus(): Promise<Auth.API.Status.Response> {
        const row = await DB.asService('read deployment claim', (db) =>
            db.selectFrom('deployment').select('claimed_at').executeTakeFirst(),
        );

        return { claimed: Boolean(row?.claimed_at) };
    }

    public async getMe(principal: Principal.User): Promise<Auth.API.Me.Get.Response> {
        const user = await DB.asUser(principal, (trx) => this.database.getMe(trx, principal.userId));
        return { user, role: principal.role };
    }

    public async updateMe(
        principal: Principal.User,
        payload: Auth.API.Me.Update.Request,
    ): Promise<Auth.API.Me.Update.Response> {
        const user = await DB.asUser(principal, (trx) => this.database.updateMe(trx, principal.userId, payload));
        return { user };
    }
}
