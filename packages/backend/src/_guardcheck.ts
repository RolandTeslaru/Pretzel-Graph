import './load-env';
import { DB } from '@/db';
import { VersionControlDatabase } from './services/VersionControl/version-control.database';
import { ChatDatabase } from './services/Chat/chat.database';
import { ExecutionDatabase } from './services/Execution/execution.database';
import { LibraryDatabase } from './services/Library/library.database';
import { VaultDatabase } from './services/Vault/vault.database';
import { WorkbenchDatabase } from './services/Workbench/workbench.database';
import { Auth, VersionControl, Workflow } from '@pretzel-graph/shared/domain';

// --- LAYER 1+2: compile time -------------------------------------------------
// Both of these must be errors. If either stops erroring, the guard is dead.
const vc = new VersionControlDatabase();

declare const serviceTrx: DB.Transaction<'service'>;
// @ts-expect-error a service handle must not reach a user-only method
void (() => vc.list(serviceTrx, { workflowId: 'x' as Workflow.Id }));

declare const eitherTrx: DB.Transaction<'user' | 'service'>;
// @ts-expect-error an either-role handle must not reach a user-only method
void (() => vc.list(eitherTrx, { workflowId: 'x' as Workflow.Id }));

async function main() {
    // --- LAYER 3: boot time --------------------------------------------------
    // Importing above already ran every @DatabaseClass. Reaching here means no
    // method was left undeclared.
    void [ChatDatabase, ExecutionDatabase, LibraryDatabase, VaultDatabase, WorkbenchDatabase];
    console.log('boot check   -> all database classes fully declared');

    // --- LAYER 4: runtime ----------------------------------------------------
    const seed = await DB.asService('guardcheck seed', (trx) =>
        trx.selectFrom('version_control').select(['user_id', 'workflow_id']).limit(1).executeTakeFirstOrThrow());

    const principal = { userId: seed.user_id as Auth.User.Id };

    const ok = await DB.asUser(principal, (trx) =>
        vc.list(trx, { workflowId: seed.workflow_id as Workflow.Id }));
    console.log(`asUser       -> ${ok.length} publications  PASS`);

    // Force the runtime check: hand a service transaction to a user-only method
    // by casting away the type, exactly as `as any` would in real code.
    let blocked = false;
    try {
        await DB.asService('guardcheck violation', (trx) =>
            vc.list(trx as unknown as DB.UserTransaction, { workflowId: seed.workflow_id as Workflow.Id }));
    }
    catch (e) {
        blocked = true;
        console.log(`runtime tag  -> blocked: ${(e as Error).message}`);
    }
    if (!blocked) console.log('runtime tag  -> NOT BLOCKED  FAIL');

    // An untagged raw handle must also be refused.
    let untagged = false;
    try {
        await vc.list({} as unknown as DB.UserTransaction, { workflowId: seed.workflow_id as Workflow.Id });
    }
    catch {
        untagged = true;
    }
    console.log(`untagged     -> ${untagged ? 'blocked  PASS' : 'ALLOWED  FAIL'}`);

    await DB.destroyPools();
}

main().catch(async (e) => { console.error(e); await DB.destroyPools(); process.exit(1); });
