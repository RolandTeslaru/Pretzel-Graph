import { Gateway } from '@pretzel-graph/shared/domain';
import { GatewaySocket } from '../../../../node-sdk/src/connections/gateway-socket';
import {
    Client as DiscordClient,
    Events as DiscordEvents,
    GatewayIntentBits,
    Partials,
    type ClientEvents,
    type Message,
} from 'discord.js';
import { System } from '@pretzel-graph/shared/system';
import { Definition } from './definition';
import { Discord } from '../../Integrations/Discord/domain';
import { Mapper } from './mappers';


export class DiscordSocket extends GatewaySocket<typeof Definition> {
    private readonly log = System.log.withContext("DiscordSocket")

    // The mappers are the list: an event with no mapper has no shape to hand a workflow.
    private static readonly EVENTS = Object.keys(Mapper) as (keyof ClientEvents)[]

    private _client: DiscordClient | null = null

    private get client(){
        if(!this._client)
            throw new Error("Discord Client has been initialized")

        return this._client
    }


    
    public async connect(){
        this._client = new DiscordClient({
            intents: this.intents(),
            partials: [Partials.Channel],
        });
    
        for (const type of DiscordSocket.EVENTS)
            this.client.on(type, (...args: unknown[]) => this.dispatchEvent(type, args))

        this.client.on(DiscordEvents.Error, error => this.log.error(`Discord connection ${this.connection.id} failed: ${error.message}`))
        // discord.js resumes recoverable closes itself; this fires only once it has stopped trying.
        this.client.on(DiscordEvents.ShardDisconnect, event => this.ctx.fail(new Error(`Discord closed the connection (code ${event.code})`)))
        const { botToken } = this.ctx.credentialsAPI.getDecryptedValue(this.credential.blob)

        // login() only starts the gateway handshake; ClientReady is when Discord has accepted the bot.
        await new Promise<void>((resolve, reject) => {
            // A bot's user id is its application id, and it outlives both the token and the connection row.
            this.client.once(DiscordEvents.ClientReady, ready => {
                this.ctx.identify(ready.user.id)
                resolve()
            })
            this.client.login(botToken).catch(error => reject(this.describeLoginError(error)))
        })
    }

    // One connection field per intent, so the socket asks Discord for exactly what was ticked.
    private intents(){
        const bits: Record<string, GatewayIntentBits> = {
            guilds:                        GatewayIntentBits.Guilds,
            direct_messages:               GatewayIntentBits.DirectMessages,
            guild_messages:                GatewayIntentBits.GuildMessages,
            message_content:               GatewayIntentBits.MessageContent,
            guild_members:                 GatewayIntentBits.GuildMembers,
            guild_message_reactions:       GatewayIntentBits.GuildMessageReactions,
            direct_message_reactions:      GatewayIntentBits.DirectMessageReactions,
            guild_message_typing:          GatewayIntentBits.GuildMessageTyping,
            direct_message_typing:         GatewayIntentBits.DirectMessageTyping,
            guild_message_polls:           GatewayIntentBits.GuildMessagePolls,
            direct_message_polls:          GatewayIntentBits.DirectMessagePolls,
            guild_voice_states:            GatewayIntentBits.GuildVoiceStates,
            guild_presences:               GatewayIntentBits.GuildPresences,
            guild_moderation:              GatewayIntentBits.GuildModeration,
            guild_expressions:             GatewayIntentBits.GuildExpressions,
            guild_integrations:            GatewayIntentBits.GuildIntegrations,
            guild_webhooks:                GatewayIntentBits.GuildWebhooks,
            guild_invites:                 GatewayIntentBits.GuildInvites,
            guild_scheduled_events:        GatewayIntentBits.GuildScheduledEvents,
            auto_moderation_configuration: GatewayIntentBits.AutoModerationConfiguration,
            auto_moderation_execution:     GatewayIntentBits.AutoModerationExecution,
        }

        const fieldValues = this.fieldValues as Record<string, unknown>

        return Object.entries(bits)
            .filter(([fieldId]) => fieldValues[fieldId] === true)
            .map(([, bit]) => bit)
    }

    // Discord reports a privileged intent the application has not enabled as a bare handshake failure.
    private describeLoginError(error: unknown){
        const message = error instanceof Error ? error.message : String(error)

        if (/disallowed intent/i.test(message))
            return new Error(
                "Discord refused the connection: this bot has not enabled the Message Content Intent. "
                + "Turn it on in the Discord developer portal under Bot → Privileged Gateway Intents, "
                + "or turn off Read Message Content on this connection.",
            )

        if (/token/i.test(message))
            return new Error("Discord rejected the bot token. Check the credential on this connection.")

        return error instanceof Error ? error : new Error(message)
    }

    public async disconnect(){
        await this._client?.destroy()
        this._client = null
    }

    public dispatchEvent(type: keyof ClientEvents, args: unknown[]){
        const subject = args[0]

        // The bot's own messages would let a reply trigger the workflow that sent it.
        if (isMessage(subject) && subject.author.id === this.client.user?.id)
            return

        // A throw here happens inside a discord.js handler, where it would take the socket down.
        try {
            this.ctx.dispatch(Discord.Event.Schema.parse({
                type,
                ...this.messageFlags(subject),
                ...mapEvent(type, args),
            }))
        }
        catch (error) {
            this.log.error(`Discord ${type} event could not be dispatched: ${(error as Error).message}`)
        }
    }

    // Neither flag is answerable from the payload alone: both depend on which bot this connection is.
    private messageFlags(subject: unknown){
        if (!isMessage(subject))
            return {}

        return {
            directMessage: !subject.guildId,
            mentionsMe:    Boolean(this.client.user && subject.mentions?.users?.has(this.client.user.id)),
        }
    }

}

// discord.js hands partial payloads for anything it has not cached, which can make a mapper throw;
// the event is dropped rather than dispatched half-built.
const mapEvent = (type: keyof ClientEvents, args: unknown[]) => {
    const map = (Mapper as Record<string, ((...args: unknown[]) => object) | undefined>)[type]

    if (!map)
        return null

    try {
        return serialize(map(...args)) as object
    }
    catch {
        return null
    }
}

const isMessage = (value: unknown): value is Message =>
    typeof value === 'object' && value !== null && 'author' in value && 'channelId' in value

// discord.js flattens undefined properties through as undefined, which is not JSON; the round trip
// drops them, turns dates into strings, and leaves a value the event schema accepts.
const serialize = (value: unknown) => {
    const flattened = value && typeof (value as { toJSON?: unknown }).toJSON === 'function'
        ? (value as { toJSON(): unknown }).toJSON()
        : value

    if (flattened === undefined || flattened === null)
        return null

    try {
        return JSON.parse(JSON.stringify(flattened))
    }
    catch {
        return null
    }
}

export { DiscordSocket as Socket }
