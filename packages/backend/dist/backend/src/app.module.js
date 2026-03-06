"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const constants_1 = require("@vx-agent-editor/shared/constants");
const orchestrator_module_1 = require("./services/Orchestrator/orchestrator.module");
const chat_module_1 = require("./services/Chat/chat.module");
const execution_session_module_1 = require("./services/ExecutionSession/execution-session.module");
const library_module_1 = require("./services/Library/library.module");
const shelf_module_1 = require("./services/Shelf/shelf.module");
const workbench_module_1 = require("./services/Workbench/workbench.module");
const realtime_module_1 = require("./services/Realtime/realtime.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: constants_1.REDIS_HOST,
                    port: constants_1.REDIS_PORT,
                },
            }),
            orchestrator_module_1.OrchestratorModule,
            chat_module_1.ChatModule,
            execution_session_module_1.ExecutionSessionModule,
            library_module_1.LibraryModule,
            shelf_module_1.ShelfModule,
            workbench_module_1.WorkbenchModule,
            realtime_module_1.RealtimeModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
