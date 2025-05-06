// Holden Ernest - 4/24/2025
// Handles the sending of async messages to clients

import { CommandInteraction, ChannelType, GuildBasedChannel, Client, MessagePayload, AttachmentBuilder, Base64String } from "discord.js"
import * as DB from "./database"
import { channelFromID } from "./index"
import { GameSaveInfo, UserSaveInfo } from "./steam-manager";
import { generateToken } from "./tokenGenerator";
import { GuildInfo } from "./database";
import { GameInfo } from "steamapi";
import { sendChirp } from "./chirp";

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
export async function sendImageToChannel(channel:GuildBasedChannel, base64_img:string, message?:string): Promise<boolean> {
    if (!channel) return false;
    if (channel.isTextBased()) {

        const sfbuff = Buffer.from(base64_img.split(",")[1] ? base64_img.split(",")[1] : base64_img, "base64");

        const attachment = new AttachmentBuilder(sfbuff);
        try {
            await channel.send({ files: [attachment], content: message });
            return true;
        } catch (e) {
            console.error("Sending image error: " + e);
        }
    }
    return false;
}

export async function sendGameChangeToChannel(guild:GuildInfo, userData:UserSaveInfo, gameInfo:GameSaveInfo) {
    if (!gameInfo.lastPlayed) return;

    const userString = `${userData.discordID ? `<@${userData.discordID}>` : userData.steamUser}`;
    const daysClean = daysPast(gameInfo.lastPlayed);
    const message = `Congrats ${userString}! You havent played **${gameInfo.gameName}** for ${daysClean} days!`
    const c = channelFromID(guild.channelID);

	// check if you played since last checked.
	const oldLastPlayed = await DB.dbGetLastPlayed(guild.guildID, userData.steamID, gameInfo.id.toString());
	if (oldLastPlayed && oldLastPlayed < gameInfo.lastPlayed) {
		const lostStreak = daysPast(oldLastPlayed) - daysClean;
		// 100 days since "last played", - 3 day streak, = lost a 97 day streak
		// 12 days since "last played", - 11 days streak, = lost a 1 day streak. //* BUT on an 11 day streak still << which is more important
		if (lostStreak > daysClean)  { // only chirp if you lost more days clean than you gained.
			await sendChirp(c, userString, gameInfo, lostStreak);
		}
		gameInfo.tokensRecieved = 0;
		DB.dbUpdateGameStats(guild.guildID, userData.steamID, gameInfo.id.toString(), gameInfo);
	}
	
	// try to generate a token
    const tokenInfo = await generateToken(userData, gameInfo);
    if (tokenInfo) {
        const sentImage = await sendImageToChannel(c, tokenInfo.b64, message);
        if (sentImage) {
            console.log("Sent token to " + userData.steamUser)
            DB.dbSetTokenCount(guild.guildID, userData.steamID, gameInfo.id.toString(), tokenInfo.tokens);
            return;
        }
    }
    
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
function daysPast(lastDate:Date):number {
    const timeDifference = Math.abs(lastDate.getTime() - new Date().getTime());
    const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
    return daysDifference;
}