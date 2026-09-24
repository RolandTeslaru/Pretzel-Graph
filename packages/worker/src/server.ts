import "reflect-metadata";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../../.env") });

import { NestFactory } from "@nestjs/core";
import { System } from "@pretzel-graph/shared/system";
import { WorkerModule } from "./worker/worker.module";

System.log.setAppName("Worker");

async function bootstrap() {
    const app = await NestFactory.create(WorkerModule);

    // The stop sequence delivers TERM and waits for the worker to drain.
    app.enableShutdownHooks(["SIGTERM", "SIGINT"], { useProcessExit: true });

    const port = Number(process.env.WORKER_PORT ?? 3002);

    await app.listen(port);
}

bootstrap().catch((error: unknown) => {
    console.error('Worker boot failed:', error instanceof Error ? error.message : error);
    process.exit(1);
});
