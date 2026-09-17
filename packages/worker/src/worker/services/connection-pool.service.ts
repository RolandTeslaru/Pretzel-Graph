import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConnectionManager } from '@pretzel-graph/node-sdk';
import { bounded } from '../../utils';

const PURGE_TIMEOUT_MS = 3_000;

// The database and MCP clients nodes keep open between executions.
@Injectable()
export class ConnectionPoolService implements OnApplicationShutdown {

    // Runs after the queue has drained, so no execution is still using a client.
    public async onApplicationShutdown(): Promise<void> {
        await bounded(this.purgeAll(), PURGE_TIMEOUT_MS);
    }




    // Closes every cached client of every manager.
    public async purgeAll(): Promise<void> {
        await ConnectionManager.purgeAll();
    }
}
