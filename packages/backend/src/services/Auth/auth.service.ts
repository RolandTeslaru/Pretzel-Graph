import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { createAuthenticatedClient } from '@/utils/supabase';
import { withSupabaseAssert } from '@pretzel-graph/shared/errors/supabase';
import { Auth } from '@pretzel-graph/shared/domain';

@Injectable()
export class AuthService {
    private readonly dbOps = {
        getMe: withSupabaseAssert('auth.getMe', async (
            supabase: SupabaseClient,
            userId: Auth.User.Id,
        ) => {
            const { data: row } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()
                .throwOnError();

            return Auth.User.Schema.parse(row);
        }),
    };

    public async getMe(token: string, userId: Auth.User.Id): Promise<Auth.API.Me.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        const user = await this.dbOps.getMe(supabase, userId);
        return { user };
    }
}
