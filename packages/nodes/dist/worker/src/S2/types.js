"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Arc = void 0;
const zod_1 = require("zod");
var Arc;
(function (Arc) {
    Arc.Id = zod_1.z.string().brand("ArcId");
    function createId(sourceVertexId, targetVertexId) {
        return `${sourceVertexId}:${targetVertexId}`;
    }
    Arc.createId = createId;
})(Arc || (exports.Arc = Arc = {}));
