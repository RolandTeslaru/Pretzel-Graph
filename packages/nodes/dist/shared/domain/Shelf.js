"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Shelf = void 0;
const zod_1 = require("zod");
const Foundations_1 = require("./Foundations");
const drawers_1 = require("../constants/drawers");
var Shelf;
(function (Shelf) {
    let Drawer;
    (function (Drawer) {
        Drawer.Id = zod_1.z.string().brand("DrawerId");
    })(Drawer = Shelf.Drawer || (Shelf.Drawer = {}));
    (function (Drawer) {
        Drawer.Schema = zod_1.z.object({
            id: Drawer.Id,
            displayName: zod_1.z.string(),
            icon: zod_1.z.string(),
            blueprintIds: zod_1.z.array(Foundations_1.Foundations.Blueprint.Id),
            color: zod_1.z.string().optional()
        });
        Drawer.SECTIONS = drawers_1.SECTIONS;
        Drawer.CORE_DRAWERS = drawers_1.CORE_DRAWERS;
        Drawer.BUNDLE_DRAWERS = drawers_1.BUNDLE_DRAWERS;
        Drawer.ALL_DRAWERS = drawers_1.ALL_DRAWERS;
    })(Drawer = Shelf.Drawer || (Shelf.Drawer = {}));
    let Index;
    (function (Index) {
        Index.Schema = zod_1.z.object({
            version: zod_1.z.string(),
            generatedAt: zod_1.z.string(),
            drawers: zod_1.z.record(Drawer.Id, Drawer.Schema),
            blueprints: zod_1.z.record(Foundations_1.Foundations.Blueprint.Id, Foundations_1.Foundations.Blueprint.Schema)
        });
    })(Index = Shelf.Index || (Shelf.Index = {}));
    Shelf.Section = zod_1.z.enum(["core", "mcp", "bundle"]);
    let API;
    (function (API) {
        let Blueprint;
        (function (Blueprint) {
            let Get;
            (function (Get) {
                Get.Request = zod_1.z.object({
                    blueprintId: Foundations_1.Foundations.Blueprint.Id
                });
                Get.Response = zod_1.z.object({
                    blueprint: Foundations_1.Foundations.Blueprint.Schema
                });
            })(Get = Blueprint.Get || (Blueprint.Get = {}));
            async function get(api, req) {
                const { data } = await api.post('/api/shelf/blueprint/get', req);
                return data;
            }
            Blueprint.get = get;
            let GetBatch;
            (function (GetBatch) {
                GetBatch.Request = zod_1.z.object({
                    blueprintIds: zod_1.z.array(Foundations_1.Foundations.Blueprint.Id)
                });
                GetBatch.Response = zod_1.z.object({
                    blueprints: zod_1.z.record(Foundations_1.Foundations.Blueprint.Id, Foundations_1.Foundations.Blueprint.Schema),
                    resolutionFailures: zod_1.z.array(Foundations_1.Foundations.Blueprint.ResolutionFailure.Schema),
                });
            })(GetBatch = Blueprint.GetBatch || (Blueprint.GetBatch = {}));
            async function getBatch(api, req) {
                const { data } = await api.post('/api/shelf/blueprint/getBatch', req);
                return data;
            }
            Blueprint.getBatch = getBatch;
            let GetAllInSection;
            (function (GetAllInSection) {
                GetAllInSection.Request = zod_1.z.object({
                    section: Shelf.Section
                });
                GetAllInSection.Response = zod_1.z.object({
                    blueprints: zod_1.z.record(Foundations_1.Foundations.Blueprint.Id, Foundations_1.Foundations.Blueprint.Schema)
                });
            })(GetAllInSection = Blueprint.GetAllInSection || (Blueprint.GetAllInSection = {}));
            async function getAllInSection(api, req) {
                const { data } = await api.post('/api/shelf/blueprint/getAllInSection', req);
                return data;
            }
            Blueprint.getAllInSection = getAllInSection;
            let Derive;
            (function (Derive) {
                Derive.Request = zod_1.z.object({
                    blueprintId: Foundations_1.Foundations.Blueprint.Id,
                    fieldValues: zod_1.z.record(Foundations_1.Foundations.Field.Id, Foundations_1.Foundations.Field.Value)
                });
                Derive.Response = zod_1.z.object({
                    derivedBlueprint: Foundations_1.Foundations.Blueprint.Schema
                });
            })(Derive = Blueprint.Derive || (Blueprint.Derive = {}));
            async function derive(api, req) {
                const { data } = await api.post('/api/shelf/blueprint/derive', req);
                return data;
            }
            Blueprint.derive = derive;
        })(Blueprint = API.Blueprint || (API.Blueprint = {}));
    })(API = Shelf.API || (Shelf.API = {}));
})(Shelf || (exports.Shelf = Shelf = {}));
