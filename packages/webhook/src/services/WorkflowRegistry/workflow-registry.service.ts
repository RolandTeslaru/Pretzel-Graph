import { Injectable, Logger } from '@nestjs/common';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common/interfaces';
import { REDIS_HOST, REDIS_PORT } from '@vx-agent-editor/shared/constants';
import { Auth, VersionControl, Workflow } from '@vx-agent-editor/shared/domain';
import Redis from 'ioredis';

@Injectable()
export class WorkflowRegistryService implements OnModuleInit, OnModuleDestroy {

    private redisSub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

    private readonly publicationsMap = new Map<Workflow.Id, VersionControl.Publication>()

    private readonly webhookPathMap = new Map<string, Workflow.Id>()

    constructr(

    ){

    }

    public initializeCache(){
        
    }


    private handleSignal(signal: VersionControl.Signal){
        switch (signal.type){
            case "published":
                break;
            case "activated":
                break
            case "deactivated":
                break
            case "removed":
                break
        }
    }

    async onModuleInit() {
        
    }

    async onModuleDestroy() {
        this.redisSub.disconnect();
    }

}