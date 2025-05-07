// Holden Ernest - 4/22/2025
// A simple database script to manage all the database type things. Hopefully it would be easy to move to an sql solution if need be.

import JSONdb from 'simple-json-db';
import { AppBase } from 'steamapi';
import { distance } from "closest-match";
import { GameSaveInfo } from './steam-manager';

const usersDB = new JSONdb("./database/users.json"); // stores the IDs of users
const gamesDB = new JSONdb("./database/games.json"); // stores the IDs of games
const allGamesDB = new JSONdb("./database/allGames.json"); // stores whatever tracked games each user has
const guildsDB = new JSONdb("./database/guilds.json"); // assign channels to each guild

//discordID, steamID, gameID are all unique

//!
//! TODO: make this all save asynchronously at intermittent intervals and instead store everything in memory.
//! SQL would probably be easiest
//!

export async function dbSaveUser(steamID:string, model:any) {
    usersDB.set(steamID, model);
}
export async function dbUpdateUserDiscord(oldDiscordID:string, newDiscordID:string) {
    const users = usersDB.JSON();
    for (const key in users) {
        if (users[key].hasOwnProperty("discordID")) {
            if (users[key].discordID == oldDiscordID) {
                var user = usersDB.get(key);
                user.discordID = newDiscordID;
                usersDB.delete(key);
            }
        }
    }
    
}

export async function dbGetUserFromSteam(steamID:string) {
    if(!usersDB.has(steamID)) return false;
    return usersDB.get(steamID);
}
export async function dbGetSteamIDFromDiscord(discordID:string): Promise<string | false> {
    var theKey;
    for (var key in usersDB.JSON()) {
        const dUser = usersDB.get(key)["discordID"];
        if (dUser && dUser == discordID) theKey = key;
    }
    if (!theKey) return false;
    return theKey;
}
export async function dbGetAllGameStats(guildID:string, steamID:string): Promise<GameSaveInfo[] | false> {
    if (!gamesDB.has(guildID)) return false;
    const allUsers = gamesDB.get(guildID);
    if (!allUsers.hasOwnProperty(steamID)) return false;
    return allUsers[steamID];
}
export function dbUserTracksGame(guildID:string, steamID:string, gameID:string) {
    if (!gamesDB.has(guildID)) return false;
    const userGames = gamesDB.get(guildID);
    if (!userGames.hasOwnProperty(steamID)) return false;
    return gameID in userGames[steamID];
}
export async function dbSaveGameStats(guildID:string, steamID:string, gameID:string, gameStats:GameSaveInfo) {
    const oldUserGames = gamesDB.get(guildID);
    var model = Object.assign({}, oldUserGames);
    if (!model.hasOwnProperty(steamID)) model[steamID] = {}
    model[steamID][gameID] = gameStats;
    gamesDB.set(guildID, model);
}
export async function dbUserOwnsGame(guildID:string, steamID:string, gameID:string) {
    if (!gamesDB.has(guildID)) return false;
    if(!(steamID in gamesDB.get(guildID))) return false;
    const hasGame = gamesDB.get(guildID)[steamID][gameID]
    return hasGame ? hasGame : false;
}

export async function dbUpdateAllGames(gameData:AppBase[]) {
    allGamesDB.deleteAll();
    allGamesDB.set("games", gameData); //* in the future, remove games with type dlc
    allGamesDB.sync();
    console.log("Done updating all games.");
}
export async function dbGetGameID(gameName:string) {
    console.log("Finding game: " + gameName);
    var match = bestDistanceGame(gameName, allGamesDB.get("games"))
    console.log("Found game: " + match.name);

    return match;
}
export async function dbUntrackUsersGame(guildID:string, steamID:string, gameID:string) {
    const oldGames = gamesDB.get(guildID);
    if (oldGames[steamID].hasOwnProperty(gameID)) {
        delete oldGames[steamID][gameID];
        gamesDB.set(guildID, oldGames);
    }
}
export async function dbGetAllUsersFromGuild(guildID:string): Promise<string[] | false> {
    if (!gamesDB.has(guildID)) return false;
    const theUsers = Object.keys(gamesDB.get(guildID));
    return theUsers;
}
export function dbGamesEmpty(): boolean {
    const test = !allGamesDB.has("games");
    return test;
}
export async function dbSetTokenCount(guildID:string, steamID:string, gameID:string, tokens?:number) {
    var entry = gamesDB.has(guildID) ? gamesDB.get(guildID) : false;
    if (!entry || !(entry.hasOwnProperty(steamID)) || !(entry[steamID].hasOwnProperty(gameID))) return false;
    entry[steamID][gameID].tokensRecieved = tokens ? tokens : 1;
    gamesDB.set(guildID, entry);
}
export async function dbGetLastPlayed(guildID:string, steamID:string, gameID:string): Promise<Date | false> {
    var entry = gamesDB.has(guildID) ? gamesDB.get(guildID) : false;
    if (!entry || !(entry.hasOwnProperty(steamID)) || !(entry[steamID].hasOwnProperty(gameID))) return false;
    return new Date(entry[steamID][gameID].lastPlayed);
}
export async function dbUpdateGameStats(guildID:string, steamID:string, gameID:string, gameInfo:GameSaveInfo) {
    var entry = gamesDB.has(guildID) ? gamesDB.get(guildID) : false;
    if (!entry || !(entry.hasOwnProperty(steamID)) || !(entry[steamID].hasOwnProperty(gameID))) return false;
    entry[steamID][gameID] = gameInfo;
    gamesDB.set(guildID, entry);
}

// GUILD SAVING
export async function dbSetGuildChannel(guildID:string, channelID:string) {
    guildsDB.set(guildID, channelID);
}
export async function dbGetGuildChannel(guildID:string) {
    return guildsDB.get(guildID);
}
export async function dbGetAllGuilds(): Promise<GuildInfo[]> {
    const allGuilds = guildsDB.JSON();
    const allKeys = Object.keys(allGuilds);
    const allInfo:GuildInfo[] = allKeys.map((key) => {
        return {guildID: key, channelID: allGuilds[key]};
    });
    return allInfo;
}
export type GuildInfo = {
    guildID: string,
    channelID: string
}

function bestDistanceGame(target:string, arr:AppBase[]) {
    var match = {
        name: "",
        distance: 10, // Change this for minimum distance
        id: -1
    }
    if (!arr) return match;
    target = target.toLowerCase()

    arr.forEach((game) => {
        var d = distance(target,game.name.toLowerCase());
        if (d < match.distance) {
            // update the new closest match
            match.distance = d;
            match.name = game.name;
            match.id = game.appid;
        }
    });
    return match;
}