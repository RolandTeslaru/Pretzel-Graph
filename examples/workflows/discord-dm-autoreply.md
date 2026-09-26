# Discord DM auto-reply

This example listens for direct messages sent to a Discord bot and replies in the same channel:

```text
Discord Events (Message Sent) -> Discord (Send Message)
```

## Import

1. Add a **Discord Bot** credential containing your bot token, then create a Discord connection with that credential.
2. Create or open a workflow.
3. Right-click the canvas and choose **Import from JSON**.
4. Select `discord-dm-autoreply.json` from this directory.
5. On **Receive Discord DM**, select the Discord connection.
6. On **Reply to Discord DM**, select the Discord Bot credential used by that connection.

The connection needs the default **Direct Messages** intent. Send the bot a DM while testing or after deploying the workflow; it replies with the sender's name and original message.

The template deliberately excludes server messages. To use it in a server, change **Origin** to **Servers**, enable **Server Messages** on the connection, and leave **Only When Mentioned** enabled.
