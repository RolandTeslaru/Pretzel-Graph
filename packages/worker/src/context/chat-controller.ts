import { Chat } from "@vx-agent-editor/shared/domain";

export class ChatController {

    private isChatNeeded: boolean = false;
    
    constructor(
        public readonly chatId: Chat.Id,
    ){
        if(this.chatId)
            Chat.API.
    }

    public setIsChatNeeded(val: boolean){
        this.isChatNeeded = val;
    }
}