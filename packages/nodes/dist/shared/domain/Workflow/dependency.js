"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dependency = void 0;
const zod_1 = require("zod");
const ids_1 = require("./ids");
const data_1 = require("./data");
var Dependency;
(function (Dependency) {
    let Publication;
    (function (Publication) {
        Publication.Id = ids_1.PublicationId;
        Publication.Schema = zod_1.z.object({
            id: ids_1.PublicationId,
            workflow_id: ids_1.WorkflowId,
            version: zod_1.z.number(),
            get workflow_data() { return data_1.Data.Schema; },
            published_at: zod_1.z.coerce.date(),
            publication_name: zod_1.z.string(),
            display_name: zod_1.z.string(),
            icon: zod_1.z.string().nullable().optional(),
            accent: zod_1.z.string().nullable().optional(),
        });
        Publication.UpdateInfo = zod_1.z.object({
            workflowId: ids_1.WorkflowId,
            publicationId: ids_1.PublicationId,
            version: zod_1.z.number(),
            name: zod_1.z.string(),
            description: zod_1.z.string().nullable(),
        });
    })(Publication = Dependency.Publication || (Dependency.Publication = {}));
    let Draft;
    (function (Draft) {
        Draft.Schema = zod_1.z.object({
            workflow_id: ids_1.WorkflowId,
            get workflow_data() { return data_1.Data.Schema; },
            display_name: zod_1.z.string(),
            icon: zod_1.z.string().nullable().optional(),
            accent: zod_1.z.string().nullable().optional(),
            workflow_updated_at: zod_1.z.coerce.date(),
        });
        Draft.UpdateInfo = zod_1.z.object({
            workflowId: ids_1.WorkflowId,
            workflow_updated_at: zod_1.z.coerce.date(),
        });
    })(Draft = Dependency.Draft || (Dependency.Draft = {}));
    Dependency.Schema = zod_1.z.union([Publication.Schema, Draft.Schema]);
    Dependency.Variant = zod_1.z.enum(["draft", "publication"]);
})(Dependency || (exports.Dependency = Dependency = {}));
