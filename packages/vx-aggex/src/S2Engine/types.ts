import { z } from "zod";
import { Vertex } from "./graph";

export namespace Arc {
    export const Id = z.string().brand("ArcId");
    export type Id = z.infer<typeof Arc.Id>;

    export function createId(sourceVertexId: Vertex.Id, targetVertexId: Vertex.Id) {
        return `${sourceVertexId}:${targetVertexId}` as Arc.Id;
    }
}
