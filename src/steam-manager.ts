// Holden Ernest - 4/24/2025
// interface between the database and the commands with access to steam information

import SteamAPI, { AppBase, GameInfoBasic, UserPlaytime } from 'steamapi';
import dotenv from "dotenv";
import * as DB from "./database";

dotenv.config();
const STEAM_KEY = process.env.STEAM_KEY as string;
const Steam = new SteamAPI(STEAM_KEY);

export const codes = {
	badCall: -1,
	notRecieved: 0,
	forbidden: 1,
	apiError: 4,
}

export async function getSteamIDFromDiscord(discordID:string): Promise<string | false> {
    return await DB.dbGetSteamIDFromDiscord(discordID);
}

// Get the user info from a Steam ID, (pass in a discord ID to assign it to this user)
//* SAVES
export async function getSteamUserData(steamID:string, discordID?:string) {
	if (!Number(steamID)) return {code: codes.badCall};
	
	// check if user in the db
	const gameDetails = await DB.dbGetUserFromSteam(steamID);
	if (gameDetails) {
		// if you didnt specify a discord user
		if (!discordID || ( discordID && gameDetails.discordID != "")) {
			return gameDetails;
		}
		//if you did speficiy a discord user and its currently empty, it needs to be saved
	}

	// if its not already in the database, get the stats then save it to the database
	return await saveUser(steamID, discordID);
}

//* SAVES
export async function saveUser(steamID:string, discordID?:string) {
	try {
		const data = await Steam.getUserSummary(steamID);
		const model = {
			steamUser: data.nickname,
			steamURL: data.profileURL,
			discordID: discordID,
			steamPFP: data.avatar.large
		}

		await DB.dbSaveUser(steamID, model);
		return model;
	} catch (e){
		console.error("Save User: " + e);
		return {code: codes.apiError};
	}
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
    if (!steamID || !gameID) return {code: codes.badCall};
    const gameDetails = await userOwnsGame(guildID, steamID, gameID);
    if (!gameDetails || gameDetails.hasOwnProperty("code")) return gameDetails ? gameDetails : {code: codes.notRecieved};

    try {
		console.log(steamID + " : " + gameID);
        const res = await Steam.getUserStats(steamID, gameID);
		console.log("L");
        const model = {
            gameName: res.game, //! this data isnt always right for some reason
            minutes: gameDetails.minutes,
            lastPlayed: gameDetails.lastPlayedAt,
			iconURL: gameDetails.game.logoURL,
			headerURL: gameDetails.game.headerURL,
            //stats: res.stats ? res.stats : []
        }

        // save to db
        await DB.dbSaveGameStats(guildID, steamID, gameID.toString(), model);
        return model;
    } catch (e) {
		const er = (e as Error).message.toLowerCase();
		console.error("getUserStats : " + er + " : " + e)
		if (er.startsWith("forbidden")) return {code: codes.forbidden}
        
    }
    return {code: codes.apiError};
}

// returns if the user owns the game, and returns the detailed game info if so.
async function userOwnsGame(guildID:string, steamID:string, gameID:number) {
    if (!steamID || !gameID) return {code: codes.badCall};
    
    const dbOwns = await DB.dbUserOwnsGame(guildID, steamID, gameID.toString());
    if (dbOwns) return dbOwns;

    try {
        const res = await Steam.getUserOwnedGames(steamID);
        const result = res.find(obj => {
            return obj["game"]["id"] === gameID
        });
        return result;
    } catch (e) {
        console.error("Owns Game: " + (e as Error).name + " : " + e);
    }
    return {code: codes.apiError};
}

async function tryUpdateAllGames() {
	//TODO: make some kind of update scheduled update so the 'all games' list is up to date
	if (DB.dbGamesEmpty()) {
		console.log("Updating all games...");
		const res = await Steam.getAppList();
		await DB.dbUpdateAllGames(res);
	}
}

export async function untrackUsersGame(guildID:string, steamID:string, gameID:string) {
	DB.dbUntrackUsersGame(guildID, steamID,gameID);
}

export type GameChanges = {
	name: string,
	id: number,
	lastPlayed: Date,
	prevLastPlayed: Date,
	totalTime: number, // if this game has a higher total, you should be more weary of the time change
}

// given a list of game IDs, go through recent games and track 
export async function getChangesFromRecentGames(steamID:string): Promise<GameChanges[]> {
	const recentGames = await Steam.getUserRecentGames(steamID);

	var allChanges:GameChanges[] = [];

	recentGames.forEach(async (g) => {
		const headerURL = g.game.headerURL; // header used for chip gen
		const iconURL = g.game.iconURL; // 32x32 GAME ICON
		const changes = await getGameStatChanges("",steamID,g);
	});

	return allChanges;
}
async function getGameStatChanges(guildID:string, steamID:string, newStats:UserPlaytime<GameInfoBasic>): Promise<GameChanges> {
	const oldStats = await DB.dbGetAllGameStats(guildID, steamID);

	var changes:GameChanges = {
		name: "",
		id: oldStats.key, //! untested
		prevLastPlayed: oldStats.lastPlayed,
		lastPlayed: newStats.lastPlayedAt ? newStats.lastPlayedAt : new Date(),
		totalTime: newStats.minutes
	}
	return changes;
}