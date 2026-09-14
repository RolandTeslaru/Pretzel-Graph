import { Library, type Skill } from '@pretzel-graph/shared/domain';
import { api } from '@/SDKs/ApiInterceptorSDK';
import type { LibrarySDK, LibrarySDKImpl } from '../sdk';
import { rebuildTree } from './tree';

export type SkillActions = {
    get: (id: Skill.Id) => Promise<Skill>;
    create: (payload: Library.API.Skill.Create.Request) => Promise<Skill>;
    update: (payload: Library.API.Skill.Update.Request) => Promise<Skill>;
    move: (id: Skill.Id, folderId: Library.Folder.Id) => Promise<Skill>;
    delete: (id: Skill.Id) => Promise<Library.API.Skill.Remove.Response>;
};

// The store keeps skill listings only; the body is fetched when a skill is opened.
export function putSkillMeta(s: LibrarySDK.State, skill: Skill | Skill.Meta) {
    const meta: Partial<Skill> = { ...skill };
    delete meta.content;
    s.skillMetas[skill.id] = meta as Skill.Meta;
}

export function createSkillActions(sdk: LibrarySDKImpl) {
    const setState = sdk.useStore.setState;

    return {
        get: async (id) => {
            const data = await Library.API.Skill.get(api, { id });
            setState((s) => { putSkillMeta(s, data); });
            return data;
        },

        create: async (payload) => {
            const data = await Library.API.Skill.create(api, payload);
            setState((s) => { putSkillMeta(s, data); });
            rebuildTree(sdk);
            return data;
        },

        update: async (payload) => {
            const data = await Library.API.Skill.update(api, payload);
            setState((s) => { putSkillMeta(s, data); });
            rebuildTree(sdk);
            return data;
        },

        move: async (id, folderId) => {
            const data = await Library.API.Skill.update(api, { id, folder_id: folderId });
            setState((s) => { putSkillMeta(s, data); });
            rebuildTree(sdk);
            return data;
        },

        delete: async (id) => {
            const data = await Library.API.Skill.remove(api, { id });
            setState((s) => { delete s.skillMetas[id]; });
            rebuildTree(sdk);
            return data;
        },
    } satisfies SkillActions
}
