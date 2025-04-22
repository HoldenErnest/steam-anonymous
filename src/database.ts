// Holden Ernest - 4/22/2025
// A simple database script to manage all the database type things. Hopefully it would be easy to move to an sql solution if need be.

import JSONdb from 'simple-json-db';
import { AppBase } from 'steamapi';
import { distance } from "closest-match";

const usersDB = new JSONdb("./database/users.json"); // stores the IDs of users
const gamesDB = new JSONdb("./database/games.json"); // stores the IDs of games
const allGamesDB = new JSONdb("./database/allGames.json"); // stores whatever tracked games each user has

//discordUser, steamID, gameID are all unique

export async function dbSaveUser(steamID:string, steamUser:string, discordUser:string, steamURL:string) {
    if (!usersDB.has(steamID)) {
        usersDB.set(steamID, {steamUser, discordUser, steamURL});
    }
    
    //update user if its already in there
    var model = usersDB.get(steamID);
    model.steamUser = steamUser ? steamUser: model.steamUser;
    model.discordUser = discordUser ? discordUser : "";
    model.steamURL = steamURL ? steamURL: model.steamURL;
    usersDB.set(steamID, model);
}

export async function dbGetUserFromSteam(steamID:string) {
    if(!usersDB.has(steamID)) return false;
    return usersDB.get(steamID);
}
export async function dbGetSteamIDFromDiscord(discordUser:string): Promise<string | boolean> {
    var theKey;
    for (var key in usersDB.JSON()) {
        const dUser = usersDB.get(key)["discordUser"];
        if (dUser && dUser == discordUser) theKey = key;
    }
    if (!theKey) return false;
    return theKey;
}
async function dbGetAllGameStats(steamID:string) {
    if (!gamesDB.has(steamID)) return false;
    return gamesDB.get(steamID)
}
export async function dbGetGameStats(steamID:string, gameID:string) {
    
}
export async function dbSaveGameStats(steamID:string, gameID:string, gameStats:any) {
    const oldUserGames = gamesDB.get(steamID);
    var model =  Object.assign({}, oldUserGames);
    model[gameID] = gameStats;
    gamesDB.set(steamID, model);
}
export async function dbUserOwnsGame(steamID:string, gameID:string) {
    if(!gamesDB.has(steamID)) return false;
    const hasGame = gamesDB.get(steamID)[gameID]
    return hasGame ? hasGame : false;
    
}

export async function dbUpdateAllGames(gameData:AppBase[]) {
    console.log("Updating all games...");
    allGamesDB.deleteAll();
    allGamesDB.set("games", gameData); //* in the future, remove games with type dlc
    console.log("Done updating all games.");
}
export async function dbGetGameID(gameName:string) {
    console.log("Finding game: " + gameName);
    var match = bestDistanceGame(gameName, allGamesDB.get("games"))
    console.log("Found game: " + match.name);

    return match;
}
export function dbGamesEmpty(): boolean {
    const arrLen = Object.keys(usersDB.JSON()).length;
    return arrLen <= 1;
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