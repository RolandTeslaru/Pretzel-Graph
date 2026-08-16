import "reflect-metadata";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../../.env") });

import { CatalogueService } from "@pretzel-graph/node-sdk";
import { AggexWorker } from "./worker";

// Compiled runs point NODES_ROOT at the built nodes; the default is the sources
// tsx reads in development.
CatalogueService.setNodesRoot(
    process.env.NODES_ROOT ?? path.resolve(__dirname, "../../nodes/src"),
);

AggexWorker.init();