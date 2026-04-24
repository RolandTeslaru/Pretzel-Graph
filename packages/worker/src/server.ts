import "reflect-metadata";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../../.env") });

import { CatalogueService } from "@pretzel-graph/node-sdk";
import { AggexWorker } from "./worker";

CatalogueService.setNodesRoot(path.resolve(__dirname, "../../nodes/src"));

AggexWorker.init();