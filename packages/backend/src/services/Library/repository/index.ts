import { Injectable } from '@nestjs/common';
import { z } from 'zod';
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

@Injectable()
export class LibraryRepository {
    public readonly bootstrap = new BootstrapMethods();
    public readonly folder = new FolderRepository();
    public readonly workflow = new WorkflowRepository();
    public readonly skill = new SkillRepository();
}
