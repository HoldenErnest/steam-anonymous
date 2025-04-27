// Holden Ernest - 4/24/2025
// interface between the database and the commands with access to steam information

import SteamAPI, { AppBase, Game, GameInfo, GameInfoBasic, GameInfoExtended, UserPlaytime } from 'steamapi';
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
export async function getSteamUserData(steamID:string, discordID?:string): Promise<UserSaveInfo | {code:number}> {
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
		const model:UserSaveInfo = {
			steamUser: data.nickname,
			steamURL: data.profileURL,
			discordID: discordID,
			steamPFP: data.avatar.large,
			steamID: steamID
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
    var gameDetails = await userOwnsGame(guildID, steamID, gameID);
    if (!gameDetails || gameDetails.hasOwnProperty("code")) return gameDetails ? gameDetails : {code: codes.notRecieved};
	gameDetails = gameDetails as UserPlaytime<Game | GameInfo | GameInfoExtended>
    try {
        const res = await Steam.getUserStats(steamID, gameID);
        const model:GameSaveInfo = {
            gameName: res.game, //! this data isnt always right for some reason
			id: gameID,
            minutes: gameDetails.minutes,
            lastPlayed: gameDetails.lastPlayedAt,
			iconURL: gameDetails.game.logoURL,
			headerURL: gameDetails.game.headerURL,
			recentMinutes: gameDetails.recentMinutes,
			totalTime: gameDetails.minutes,
			tokensRecieved: 0
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
async function userOwnsGame(guildID:string, steamID:string, gameID:number): Promise<UserPlaytime<Game | GameInfo | GameInfoExtended> | undefined | {code:number}> {
    if (!steamID || !gameID) return {code: codes.badCall};
    
    const dbOwns = await DB.dbUserOwnsGame(guildID, steamID, gameID.toString());
    if (dbOwns) return dbOwns;

    try {
        const res = await Steam.getUserOwnedGames(steamID);
		res[0]
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

export type UserSaveInfo = {
	steamID: string,
	steamUser: string,
	steamURL: string,
	discordID: string | undefined,
	steamPFP: string
}

export type GameSaveInfo = {
	gameName: string,
	id: number,
	minutes: number,
	lastPlayed: Date | undefined,
	iconURL: string,
	headerURL: string,
	recentMinutes: number
	totalTime: number,
	tokensRecieved: number
}

// return all changes from the tracked games.
export async function getChangesFromRecentGames(guildID:string, steamID:string): Promise<GameSaveInfo[]> {
	//const recentGames = await Steam.getUserRecentGames(steamID);
	var allChanges:GameSaveInfo[] = [];
	try {

		//! for some reason Steam.getUserStats(gameID) returns almost nothing. garbage api
		
		const recentGames = await Steam.getUserOwnedGames(steamID);
		const trackedGames = await DB.dbGetAllGameStats(guildID, steamID);
		if (!trackedGames) return allChanges

		for (var g1 in trackedGames) {
			for (var g2 of recentGames) {
				const changes = await getGameStatChanges(guildID, steamID, g2, trackedGames[g1]);
				if (changes) {
					allChanges.push(changes);
				}
			}
		}
	} catch (e) {
		console.error("ChangesStats: " + e);
		return [];
	}

	return allChanges;
}
async function getGameStatChanges(guildID:string, steamID:string, recentStats:UserPlaytime<Game | GameInfo | GameInfoExtended>, trackedStats:GameSaveInfo): Promise<GameSaveInfo | false> {
	if (recentStats.game.id != trackedStats.id)  {
		return false; // if these games arent the same, dont bother returning a comparison
	}
	var changes:GameSaveInfo = {
		gameName: trackedStats.gameName,
		id: trackedStats.id,
		lastPlayed: recentStats.lastPlayedAt,
		totalTime: recentStats.minutes,
		recentMinutes: recentStats.recentMinutes,
		minutes: recentStats.minutes,
		iconURL: trackedStats.iconURL,
		headerURL: trackedStats.headerURL,
		tokensRecieved: trackedStats.tokensRecieved
	}
	return changes;
}