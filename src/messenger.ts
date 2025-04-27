// Holden Ernest - 4/24/2025
// Handles the sending of async messages to clients

import { CommandInteraction, ChannelType, GuildBasedChannel, Client, MessagePayload, AttachmentBuilder, Base64String } from "discord.js"
import * as DB from "./database"
import { channelFromID } from "./index"
import { GameSaveInfo, UserSaveInfo } from "./steam-manager";
import { generateToken } from "./tokenGenerator";

var allChannels:GuildBasedChannel[] = [];

export async function sendMessageToAll(message:string) {
    allChannels.forEach(channel => {
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
        try {
            await channel.send(message);
        } catch (e) {
            console.error("Sending message error: " + e);
        }
    }
}
export async function sendImageToChannel(channel:GuildBasedChannel, base64_img:string) {
    if (!channel) return;
    if (channel.isTextBased()) {

        const sfbuff = Buffer.from(base64_img.split(",")[1], "base64");

        const attachment = new AttachmentBuilder(sfbuff);
        try {
            await channel.send({ files: [attachment] });

        } catch (e) {
            console.error("Sending image error: " + e);
        }
    }
}

export async function sendGameChangeToChannel(channelID:string, userData:UserSaveInfo, gameInfo:GameSaveInfo) {
    //! MAKE THIS BETTER!
    const message = `
    For: ${userData.discordID ? `<@${userData.discordID}>` : userData.steamUser}
    Name: ${gameInfo.gameName}
    LastPlay: ${gameInfo.lastPlayed}
    `
    const c = channelFromID(channelID);
    //await sendMessageToChannel(c, message);
    const img64 = await generateToken(userData, gameInfo);
    if (img64)
        await sendImageToChannel(c, img64);
}

export async function subscribeChannel(guildID:string, channel?:GuildBasedChannel|string) {
    if (!channel) {
        console.error("No channel was specified");
        return;
    }
    const channelID = typeof channel == "string" ? channel : channel.id;
    const oldChannelID = await DB.dbGetGuildChannel(guildID)
    DB.dbSetGuildChannel(guildID, channelID);
    removeActiveChannel(oldChannelID);
    await addChannel(channelID);
}

export async function updateAllChannels() {
    const allGuilds = await DB.dbGetAllGuilds();
    allChannels = [];
    allGuilds.forEach(guild => {
        console.log("adding channel: " + guild.channelID);
        addChannel(guild.channelID);
    });
}
// calling index.tryUpdateChannel will come here with client
export async function addChannel(channelID:string) {
    removeActiveChannel(channelID);
    const channel = channelFromID(channelID);
    allChannels.push(channel);
}
function removeActiveChannel(channelID:string) {
    allChannels = allChannels.filter(c => {
        return c.id !== channelID;
    });
}