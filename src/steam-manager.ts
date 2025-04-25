// Holden Ernest - 4/24/2025
// interface between the database and the commands with access to steam information

import SteamAPI, { AppBase } from 'steamapi';
import dotenv from "dotenv";
import * as DB from "./database";

dotenv.config();
const STEAM_KEY = process.env.STEAM_KEY as string;
const Steam = new SteamAPI(STEAM_KEY);


export async function getSteamIDFromDiscord(discordID:string): Promise<string | false> {
    return DB.dbGetSteamIDFromDiscord(discordID);
}

// Get the user info from a Steam ID, (pass in a discord ID to assign it to this user)
//* SAVES
export async function getSteamUserData(steamID:string, discordID?:string) {
	if (!Number(steamID)) return false;
	
	// check if user in the db
	const gameDetails = await DB.dbGetUserFromSteam(steamID);
	if (gameDetails) {
		// if you didnt specify a discord user
		if (!discordID || ( discordID && gameDetails.discordUser != ""))
			return gameDetails;
		//if you did speficiy a discord user and its currently empty, it needs to be saved
	}

	// if its not already in the database, get the stats then save it to the database
	try {
		const data = await Steam.getUserSummary(steamID);
		const model = {
			steamUser: data.nickname,
			steamURL: data.profileURL,
			discordUser: discordID
		}
		//console.log("large: " + data.avatar.large);
		//console.log("med: " + data.avatar.medium); /// LAST WORKING ON USER PFP
		//console.log("smal: " + data.avatar.small);

		await DB.dbSaveUser(steamID, model.steamUser, model.discordUser, model.steamURL);
		return model;
	} catch (e){
		return false;
	}
}

// getSteamUserData inherently saves.
//* SAVES
export async function saveUser(steamID:string, discordUser:string) {
	return await getSteamUserData(steamID, discordUser);
}

// get a Steam App ID based off the closest match to the game name
export async function getAppId(gameName: string) {
	if (!gameName) return;
	//const re = new RegExp(`\"appid\":(\d+)[^{}]*\"name\":\"([^\"]*${gameName}[^\"]*)\"`, "gm"); // IF you needed to go through the raw string
	
	await tryUpdateAllGames();
	var match = await DB.dbGetGameID(gameName)
	return match;
}

// Is this user currently tracking this game
export function userTracksGame(guildID:string, steamID:string, gameInfo:string): boolean {
	return DB.dbUserTracksGame(guildID, steamID, gameInfo);
}

// returns the game stats object for a specific user
//* SAVES
export async function getUserGameStats(guildID:string, steamID:string, gameID:number) {
    if (!steamID || !gameID) return {code:-1};
    const gameDetails = await userOwnsGame(guildID, steamID, gameID);
    if (!gameDetails) return {code:0};

    try {
        const res = await Steam.getUserStats(steamID, gameID);

        const model = {
            gameName: res.game,
            minutes: gameDetails.minutes,
            lastPlayed: gameDetails.lastPlayedTimestamp,
			iconURL: gameDetails.game.logoURL,
            //stats: res.stats ? res.stats : []
        }

        // save to db
        await DB.dbSaveGameStats(guildID, steamID, gameID.toString(), model);
        return model;
    } catch (e) {
		const er = (e as Error).message.toLowerCase();
		if (er.startsWith("forbidden")) return {code:1}
        
    }
    return {code:4};
}

// returns if the user owns the game, and returns the detailed game info if so.
async function userOwnsGame(guildID:string, steamID:string, gameID:number) {
    if (!steamID || !gameID) return;
    
    const dbOwns = await DB.dbUserOwnsGame(guildID, steamID, gameID.toString());
    if (dbOwns) return dbOwns;

    try {
        const res = await Steam.getUserOwnedGames(steamID);
        const result = res.find(obj => {
            return obj["game"]["id"] === gameID
        });
        return result;
    } catch (e) {
        console.error((e as Error).name);
    }
    return false;
}

async function tryUpdateAllGames() {
	//TODO: make some kind of update scheduled update so the 'all games' list is up to date
	if (DB.dbGamesEmpty()) {
		const res = await Steam.getAppList();
		await DB.dbUpdateAllGames(res);
	}
}

export async function untrackUsersGame(guildID:string, steamID:string, gameID:string) {
	DB.dbUntrackUsersGame(guildID, steamID,gameID);
}

export type GameChanges = {
	name: "",
	id: -1,
	timeDelta: 0, // difference between this gameStat and last gameStat
	totalTime: 0, // if this game has a higher total, you should be more weary of the time change
	lastPlayed: 0
}

// given a list of game IDs, go through recent games and track 
export async function getMatchingRecentGames(steamID:string) {
	const recentGames = await Steam.getUserRecentGames(steamID);
	recentGames.forEach(async (g) => {
		const icon = g.game.icon;
		const iconURL = g.game.iconURL;
		console.log("icon: " + icon);
		console.log("iconURL: " + iconURL);
	});
	
}