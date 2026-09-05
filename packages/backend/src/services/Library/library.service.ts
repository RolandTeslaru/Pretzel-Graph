import { BadRequestException, Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Library, Workflow } from '@pretzel-graph/shared/domain';
import { LibraryRepository } from './library.repository';
import { ListingService } from '../Listing/listing.service';

@Injectable()
export class LibraryService {
    constructor(
        private readonly libraryRepository: LibraryRepository,
        private readonly listings: ListingService,
    ) {}

    public readonly bootstrap = {
        get: async (
            principal: Principal.User,
        ): Promise<Library.API.Bootstrap.Get.Response> => {
            const [bootstrap, listingIdByWorkflowId] = await Promise.all([
                this.libraryRepository.bootstrap.get(principal),
                this.listings.getOwnedIds(),
            ]);

            for (const meta of bootstrap.workflow_metas)
                meta.listing_id = listingIdByWorkflowId[meta.id] ?? null;

            return bootstrap;
        },
    };

    public readonly folder = {
        create: async (
            principal: Principal.User,
            payload: Library.API.Folder.Create.Request,
        ): Promise<Library.API.Folder.Create.Response> => {
            return this.libraryRepository.folder.create(principal, payload);
        },

        update: async (
            principal: Principal.User,
            payload: Library.API.Folder.Update.Request,
        ): Promise<Library.API.Folder.Update.Response> => {
            return this.libraryRepository.folder.update(principal, payload);
        },

        delete: async (
            principal: Principal.User,
            id: Library.Folder.Id,
        ): Promise<Library.API.Folder.Remove.Response> => {
            if (id === Library.Folder.ROOT_ID)
                throw new BadRequestException('The root folder cannot be deleted');

            await this.libraryRepository.folder.delete(principal, id);

            return { ok: true };
        },

        getContents: async (
            principal: Principal.User,
            id: Library.Folder.Id,
        ): Promise<Library.API.Folder.GetContents.Response> => {
            return this.libraryRepository.folder.getContents(principal, id);
        }
    };

    public readonly workflow = {
        create: async (
            principal: Principal.User,
            payload: Library.API.Workflow.Create.Request,
        ): Promise<Library.API.Workflow.Create.Response> => {
            return this.libraryRepository.workflow.create(principal, payload);
        },

        get: async (
            principal: Principal.User,
            workflowId: Workflow.Id,
        ): Promise<Library.API.Workflow.Get.Response> => {
            return this.libraryRepository.workflow.get(principal, workflowId);
        },

        update: async (
            principal: Principal.User,
            payload: Library.API.Workflow.Update.Request,
        ): Promise<Library.API.Workflow.Update.Response> => {
            return this.libraryRepository.workflow.update(principal, payload);
        },

        delete: async (
            principal: Principal.User,
            id: Workflow.Id,
        ): Promise<Library.API.Workflow.Remove.Response> => {
            await this.listings.unshareWorkflow(id);
            await this.libraryRepository.workflow.delete(principal, id);

            // After the commit — the cached owner is still correct until the TTL, and would
            // keep authorizing routes against a row that no longer exists.

            return { ok: true };
        },

        duplicate: async (
            principal: Principal.User,
            id: Workflow.Id,
        ): Promise<Library.API.Workflow.Duplicate.Response> => {
            return this.libraryRepository.workflow.duplicate(principal, id);
        },
    };
}
