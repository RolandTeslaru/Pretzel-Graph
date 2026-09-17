import "reflect-metadata";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../../.env") });

import { NestFactory } from "@nestjs/core";
import { CatalogueService } from "@pretzel-graph/node-sdk";
import { WorkerModule } from "./worker/worker.module";

// Compiled runs point NODES_ROOT at the built nodes; the default is the sources
// ts-node reads in development.
CatalogueService.setNodesRoot(
    process.env.NODES_ROOT ?? path.resolve(__dirname, "../../nodes/src"),
);

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(WorkerModule);

    // The stop sequence delivers TERM and waits; unhandled, the process would die
    // holding job locks and open customer-database connections.
    app.enableShutdownHooks(["SIGTERM", "SIGINT"], { useProcessExit: true });
}

void bootstrap();
