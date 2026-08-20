"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tag = void 0;
const zod_1 = require("zod");
/** A topic label. Gamma carries publishing metadata on these; only the label is worth keeping. */
var Tag;
(function (Tag) {
    Tag.Schema = zod_1.z.object({
        id: zod_1.z.string().nullable(),
        label: zod_1.z.string().nullable(),
        slug: zod_1.z.string().nullable(),
    });
    Tag.fromGamma = (tag) => ({
        id: tag.id ?? null,
        label: tag.label ?? null,
        slug: tag.slug ?? null,
    });
})(Tag || (exports.Tag = Tag = {}));
