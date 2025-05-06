// Holden Ernest - 5/6/2025
// Handle chirping players if they lose a streak or something

import { GuildBasedChannel } from "discord.js";
import { GameSaveInfo } from "./steam-manager";
import { sendMessageToChannel } from "./messenger";
import fs from "fs";
// Algoritm for commentary
/*
    grab a random line from the chirp file
    Eventually you could introduce weighted random, so the worse you lose, the worse the chirp
*/

export async function sendChirp(c:GuildBasedChannel, userString:string, gameInfo:GameSaveInfo, lostStreak:number) {
    if (lostStreak < 5) return;

    //var tokenLost = gameInfo.tokensRecieved == 1 ? "bronze" : gameInfo.tokensRecieved == 2 ? "silver" : gameInfo.tokensRecieved == 3 ? "gold" : ""

    var chirp = await randomRawChirp();
    // replace all the keys in the chirp
    chirp = chirp.replace("$u", userString);
    chirp = chirp.replace("$d", lostStreak.toString());
    chirp = chirp.replace("$g", gameInfo.gameName);
    //chirp = chirp.replace("$t", tokenLost);

    return await sendMessageToChannel(c, chirp);
}

async function randomRawChirp(): Promise<string> {
    var chirp = getRandomLine("./txt/chirps.txt");

    return chirp;
}

function getRandomLine(filename:string): string{
    var line = ""
    try {
        const data = fs.readFileSync(filename, "utf-8");
        const lines = data.split('\n');
        
        line = lines[Math.floor(Math.random()*lines.length)]
    } catch (e) {
        console.error("Problem reading file " + filename);
    }
    return line;
}