import { Gateway } from '@pretzel-graph/shared/domain';
import { GatewaySocket } from '../../../../node-sdk/src/connections/gateway-socket';
import {
    Client as DiscordClient,
    Events as DiscordEvents,
    GatewayIntentBits,
    Partials,
    type Message,
} from 'discord.js';
import { System } from '@pretzel-graph/shared/system';
import { Definition } from './definition';


export class DiscordSocket extends GatewaySocket<typeof Definition> {
    private readonly log = System.log.withContext("DiscordSocket")

    private _client: DiscordClient | null = null

    private get client(){
        if(!this._client)
            throw new Error("Discord Client has been initialized")

        return this._client
    }


    
    public async connect(){
        this._client = new DiscordClient({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.DirectMessages,
            ],
            partials: [Partials.Channel],
        });
    
        this.client.on(DiscordEvents.MessageCreate, msg => this.dispatchEvent(msg))
        this.client.on(DiscordEvents.Error, error => this.log.error(`Discord connection ${this.connection.id} failed: ${error.message}`))
        // discord.js resumes recoverable closes itself; this fires only once it has stopped trying.
        this.client.on(DiscordEvents.ShardDisconnect, event => this.ctx.fail(new Error(`Discord closed the connection (code ${event.code})`)))
        const { botToken } = this.ctx.credentialsAPI.getDecryptedValue(this.credential.blob)

        await this.client.login(botToken)
    }

    public async disconnect(){
        await this._client?.destroy()
        this._client = null
    }

    public dispatchEvent(message: Message){
        const event = Gateway.Socket.Event.Schema.parse({
            provider:      'discord',
            type:          'message',
            messageId:     message.id,
            channelId:     message.channelId,
            authorId:      message.author.id,
            authorName:    message.author.globalName ?? message.author.username,
            authorIsBot:   message.author.bot,
            content:       message.content,
            directMessage: !message.inGuild(),
            createdAt:     message.createdAt.toISOString(),
        });

        this.ctx.dispatch(event)
    }

}

export { DiscordSocket as Socket }
