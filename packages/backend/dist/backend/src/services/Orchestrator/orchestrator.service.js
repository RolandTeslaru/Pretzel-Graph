"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const supabase_1 = require("@/utils/supabase");
const domain_1 = require("@vx-agent-editor/shared/domain");
const utils_1 = require("./utils");
let OrchestratorService = class OrchestratorService {
    constructor(executionQueue) {
        this.executionQueue = executionQueue;
        this.dbOps = {
            job: {
                create: async (supabase, { workflowId, userId }) => {
                    const jobId = crypto.randomUUID();
                    await supabase.from('jobs').insert({
                        id: jobId,
                        workflow_id: workflowId,
                        status: "pending",
                        created_at: new Date(),
                        updated_at: new Date(),
                        duration: 0,
                        user_id: userId
                    });
                    return jobId;
                },
                update: async (supabase, { jobId, status, error }) => {
                    await supabase.from('jobs').update({
                        status,
                        error,
                        updated_at: new Date()
                    }).eq('id', jobId);
                },
                delete: async (supabase, jobId) => {
                    await supabase.from('jobs').delete().eq('id', jobId);
                }
            }
        };
    }
    async run(token, payload) {
        const { workflow, executionSession } = payload;
        const wfCache = domain_1.Workflow.createCache(workflow);
        const workflowIssues = domain_1.Validation.Issue.checkWorkflow(workflow, wfCache);
        if (Object.entries(workflowIssues).length > 0)
            throw new Error("Workflow has issues");
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        const userId = await (0, supabase_1.getUserId)(supabase);
        if (!userId)
            throw new Error("User not found");
        const jobId = await this.dbOps.job.create(supabase, { workflowId: workflow.id, userId });
        try {
            await utils_1.SecretsResolver.resolveWorkflow(supabase, workflow);
            const queueItem = {
                jobId,
                workflow,
                userId,
                executionSession
            };
            await this.executionQueue.add('run', queueItem);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.dbOps.job.update(supabase, { jobId, status: "failed", error: errorMessage });
            throw error;
        }
        return { jobId };
    }
    async pause(token, payload) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        const { jobId } = payload;
        await this.dbOps.job.update(supabase, { jobId, status: "paused" });
    }
    async resume(token, payload) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        const { jobId } = payload;
        await this.dbOps.job.update(supabase, { jobId, status: "running" });
    }
    async terminate(token, payload) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        const { jobId } = payload;
        await this.dbOps.job.delete(supabase, jobId);
    }
    async finalise(token, payload) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        const { jobId, status } = payload;
        await this.dbOps.job.update(supabase, { jobId, status });
    }
};
exports.OrchestratorService = OrchestratorService;
exports.OrchestratorService = OrchestratorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('workflow-execution')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], OrchestratorService);
