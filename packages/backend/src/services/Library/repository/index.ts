import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { sql } from 'kysely';
import { Library, Skill } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '@/decorators/database';
import { FolderRepository } from './folder.repository';
import { WORKFLOW_META_COLUMNS, WorkflowRepository, toWorkflowMeta } from './workflow.repository';
import { SKILL_META_COLUMNS, SkillRepository, toSkillMeta } from './skill.repository';

class BootstrapMethods extends Repository {

    @ZodReturn(z.object({
        folders: Library.Folder.Schema.array(),
        workflow_metas: Library.WorkflowMeta.Schema.array(),
        skill_metas: Skill.Meta.Schema.array(),
    }))
    @Transactional('user')
    public async get(principal: Principal.User): Promise<Library.API.Bootstrap.Get.Response> {
        const [folders, workflowMetas, skillMetas] = await Promise.all([
            this.trx
                .selectFrom('folders')
                .selectAll()
                .orderBy('created_at', 'desc')
                .execute(),
            this.trx
                .selectFrom('workflows')
                .select(WORKFLOW_META_COLUMNS)
                .orderBy('created_at', 'desc')
                .execute(),
            this.trx
                .selectFrom('skills')
                .select(SKILL_META_COLUMNS)
                .orderBy('created_at', 'desc')
                .execute(),
        ]);

        return {
            folders: folders.map(DB.Folder.toDomain),
            workflow_metas: workflowMetas.map(toWorkflowMeta),
            skill_metas: skillMetas.map(toSkillMeta),
        };
    }
}

class SearchMethods extends Repository {

    // Every kind of library item in one list; each kind is one branch of a union.
    @Transactional('user', 'delegate')
    @ZodReturn(Library.API.Internal.Query.Response)
    public async query(
        principal: Principal.User | Principal.Delegate,
        filter: Library.API.Internal.Query.Request,
    ): Promise<Library.API.Internal.Query.Response> {
        const kinds = [...new Set(filter.kinds ?? Library.Ref.Kind.options)];

        if (kinds.length === 0 || filter.folderIds?.length === 0)
            return { items: [], total: 0 };

        const branches = {
            workflow: this.trx
                .selectFrom('workflows')
                .select([
                    sql<Library.Ref.Kind>`'workflow'`.as('kind'),
                    sql<string>`workflows.id::text`.as('id'),
                    'display_name as name',
                    sql<Library.Folder.Id | null>`workflows.folder_id`.as('folder_id'),
                    'description',
                    sql<boolean>`coalesce(workflows.hidden, false)`.as('hidden'),
                    sql<string | null>`null`.as('definition_id'),
                    sql<string | null>`null`.as('status'),
                    sql<Date>`workflows.updated_at`.as('updated_at'),
                ]),
            folder: this.trx
                .selectFrom('folders')
                .select([
                    sql<Library.Ref.Kind>`'folder'`.as('kind'),
                    sql<string>`folders.id::text`.as('id'),
                    'display_name as name',
                    'parent_folder_id as folder_id',
                    'description',
                    sql<boolean>`coalesce(folders.hidden, false)`.as('hidden'),
                    sql<string | null>`null`.as('definition_id'),
                    sql<string | null>`null`.as('status'),
                    sql<Date>`folders.updated_at`.as('updated_at'),
                ]),
            skill: this.trx
                .selectFrom('skills')
                .select([
                    sql<Library.Ref.Kind>`'skill'`.as('kind'),
                    sql<string>`skills.id::text`.as('id'),
                    'name',
                    sql<Library.Folder.Id | null>`skills.folder_id`.as('folder_id'),
                    sql<string | null>`skills.description`.as('description'),
                    sql<boolean>`false`.as('hidden'),
                    sql<string | null>`null`.as('definition_id'),
                    sql<string | null>`null`.as('status'),
                    sql<Date>`skills.updated_at`.as('updated_at'),
                ]),
            connection: this.trx
                .selectFrom('connections')
                .select([
                    sql<Library.Ref.Kind>`'connection'`.as('kind'),
                    sql<string>`connections.id::text`.as('id'),
                    'name',
                    sql<Library.Folder.Id | null>`connections.folder_id`.as('folder_id'),
                    sql<string | null>`null`.as('description'),
                    sql<boolean>`false`.as('hidden'),
                    sql<string | null>`connections.definition_id`.as('definition_id'),
                    sql<string | null>`connections.status`.as('status'),
                    sql<Date>`connections.updated_at`.as('updated_at'),
                ]),
        };

        const [first, ...rest] = kinds.map(kind => branches[kind]);
        const items = rest.reduce((union, branch) => union.unionAll(branch), first);

        const rows = await this.trx
            .selectFrom(items.as('item'))
            .leftJoin('folders as parent', 'parent.id', 'item.folder_id')
            .selectAll('item')
            .select([
                'parent.display_name as folder_name',
                sql<string>`count(*) over ()`.as('total'),
            ])
            .$if(!!filter.displayName, query => query.where(sql<boolean>`strpos(lower(item.name), lower(${filter.displayName})) > 0`))
            .$if(!!filter.folderIds, query => query.where('item.folder_id', 'in', filter.folderIds!))
            .orderBy('item.updated_at', 'desc')
            .orderBy('item.name')
            .limit(filter.limit ?? 50)
            .execute();

        return {
            items: rows.map(({ total, ...item }) => item),
            total: Number(rows[0]?.total ?? 0),
        };
    }
}

@Injectable()
export class LibraryRepository {
    public readonly bootstrap = new BootstrapMethods();
    public readonly folder = new FolderRepository();
    public readonly workflow = new WorkflowRepository();
    public readonly skill = new SkillRepository();
    public readonly search = new SearchMethods();
}
