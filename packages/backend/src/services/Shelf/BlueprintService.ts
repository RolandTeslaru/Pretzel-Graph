import { createAuthenticatedClient } from "../../utils/supabase";
import { ShelfContract } from "@vx-agent-editor/shared/api";
import { Shelf } from "@vx-agent-editor/shared/types";

export class BlueprintService {

    static async create(token: string, payload: ShelfContract.Blueprint.Create.Request) {
        const supabase = createAuthenticatedClient(token);

        const { id, legacy_id, drawer_id, type, display_name, description, base_classes, created_at, updated_at, data } = payload;

        const { data: result, error } = await supabase
            .from('blueprints')
            .upsert({
                id,
                legacy_id,
                drawer_id,
                type,
                display_name,

                description,
                base_classes: Array.from(base_classes || []),

                data: data,

                created_at,
                updated_at
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase Blueprint Upsert Error:", error);
            throw new Error(error.message);
        }

        return this.mapDbRowToBlueprint(result);
    }

    static async get(token: string, blueprintId: string) {
        const supabase = createAuthenticatedClient(token);

        const { data, error } = await supabase
            .from('blueprints')
            .select('*')
            .eq('id', blueprintId)
            .single();

        if (error) throw new Error(error.message);
        return this.mapDbRowToBlueprint(data);
    }

    static async list(token: string, drawerId?: string) {
        const supabase = createAuthenticatedClient(token);

        let query = supabase
            .from('blueprints')
            .select('*')

        if (drawerId) {
            query = query.eq('drawer_id', drawerId);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        return data.map((row: any) => this.mapDbRowToBlueprint(row));
    }

    private static mapDbRowToBlueprint(row: any): Shelf.Blueprint {
        return {
            id: row.id,
            legacy_id: row.legacy_id,
            drawer_id: row.drawer_id,
            type: row.type,
            display_name: row.display_name,

            description: row.description || "",
            base_classes: row.base_classes || [],

            created_at: row.created_at,
            updated_at: row.updated_at,

            data: row.data
        };
    }
}
