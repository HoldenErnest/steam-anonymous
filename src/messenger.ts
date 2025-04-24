// Holden Ernest - 4/24/2025
// Handles the sending of async messages to clients

import { CommandInteraction, ChannelType, GuildBasedChannel, Client } from "discord.js"
import * as DB from "./database"

var channels:GuildBasedChannel[] = [];

export async function sendMessageToAll(message:string) {
    channels.forEach(channel => {
        sendMessageToChannel(channel, message);
    });
}
export async function sendWelcome(channel:GuildBasedChannel, guildName:string) {
    if (!channel) return;
	var message = 
    `
## Steam Anonymous is now in ${guildName}!
Look at you. You're weak, pathetic even. You look like you need me to watch your game activity.
- I've defaulted to using this messaging channel. Type \`/subscribe\` in a different one to change that
- Start tracking your games with \`/track\`
- Dont want to remember Steam IDs? Assign a user to one with \`/track @user\`
- You can \`/untrack\` a game at any time :eyes:
	`
    sendMessageToChannel(channel, message);
}
export async function sendMessageToChannel(channel:GuildBasedChannel, message:string) {
    if (!channel) return;
    if (channel.isTextBased()) {
        channel.send(message);
    }
}

export function subscribeChannel(guildID:string, channel?:GuildBasedChannel) {
    if (!channel) {
        console.error("Problem adding channel. Does server not have Text Channels?");
        return;
    }
    DB.dbSetGuildChannel(guildID, channel.id);
    channels.push(channel);
}

export async function updateChannels(client:Client<boolean>) {
    const allGuilds = Object.values(await DB.getAllGuilds());

    allGuilds.forEach(channelID => {
        console.log("adding channel: " + channelID);
        const channel = client.channels.cache.get(channelID);
        channels.push(channel as GuildBasedChannel);
    });
}