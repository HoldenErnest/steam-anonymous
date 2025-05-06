// Holden Ernest - 4/25/2025
// Schedule events such as giving out tokens

import * as DB from "./database"
import * as Messenger from "./messenger"
import * as SteamManager from "./steam-manager"
import cron from "node-cron";
import { getChangesFromRecentGames } from "./steam-manager";


export async function scheduleTokens() {
    // CHIPS are scheduled to run at 9AM and 9PM every day, 9,21
    var task = cron.schedule('0,30 * * * * *', async () =>  {
        console.log('Running Token Generation..');
        const guilds = await DB.dbGetAllGuilds();

        for (var guild of guilds) {
            const users = await DB.dbGetAllUsersFromGuild(guild.guildID);
            if (!users) continue;
            for (var steamID of users) {
                const changes = await SteamManager.getChangesFromRecentGames(guild.guildID, steamID);
                var userData = await SteamManager.getSteamUserData(steamID);
                if (userData.hasOwnProperty("code")) continue;
                userData = userData as SteamManager.UserSaveInfo;
                for (var gameInfoObj of changes) {
                    await Messenger.sendGameChangeToChannel(guild, userData,  gameInfoObj);
                }
            };
            
        };
        console.log('Finished Token Generation..');
    }); 
}