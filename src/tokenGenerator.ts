// Holden Ernest - 4/26/2025
// Generate the token images to send as rewards

import mergeImages from "merge-images"
import { GameSaveInfo, UserSaveInfo } from "./steam-manager";
import { Canvas, Image } from "canvas"
import fs from "fs";
import sharp from "sharp";

// CONSTANTS ----------
const overlayPaths = {
    gold: './img/tokens/front/gold.png',
    silver: './img/tokens/front/silver.png',
    bronze: './img/tokens/front/bronze.png'
}
const backgroundPaths = {
    black: './img/tokens/back/black.png',
    gold: './img/tokens/back/gold.png',
    silver: './img/tokens/back/silver.png',
    bronze: './img/tokens/back/bronze.png',
}

const overlayDim = {
    width: 1000,
    height: 1000
}
const userDim = {
    width: 184,
    height: 184
}
const gameDim = {
    width: 460,
    height: 215
}
const gamePos = {
    x: Math.floor(overlayDim.width/2 - gameDim.width/2),
    y: Math.floor(overlayDim.height/2 - gameDim.height/2)
}
const pfpOffset = 100;
const userPos = {
    x: Math.floor(overlayDim.width - userDim.width - pfpOffset),
    y: Math.floor(overlayDim.height - userDim.height - pfpOffset)
}
type TokenType = {
    overlayPath:string,
    backgroundPath:string,
    tokens:number,
    daysClean:number
}
// CONSTANTS ----------

export async function generateToken(userData:UserSaveInfo, gameInfo:GameSaveInfo): Promise<{b64: string, daysClean:number, tokens:number} | false> {
    if (!gameInfo.lastPlayed) {
        console.log("game doesnt have last played.. " + gameInfo.gameName);
        return false;
    }
    const daysClean = daysPast(gameInfo.lastPlayed);

    const tokenInfo = getTokenType(daysClean,gameInfo.tokensRecieved);
    if (!tokenInfo) return false;

    const b64_string = await getImageBase64(userData, gameInfo, tokenInfo);
    if (!b64_string) return false;
    return {b64:b64_string, daysClean:daysClean, tokens:tokenInfo.tokens}
}

async function getImageBase64(userData:UserSaveInfo, gameInfo:GameSaveInfo, tokenInfo:TokenType) : Promise<string | false> {
    try {

        ensureAllImages();
        
        const base64_img = await mergeAsGeneric(userData, gameInfo, tokenInfo);
        
        return base64_img;
    } catch (e) {
        console.error("imageGen: " + e);
    }
    return false;
    
}
async function mergeAsSharp(userData:UserSaveInfo, gameInfo:GameSaveInfo, tokenInfo:TokenType): Promise<string> {

    const gameBuffer = await getImageBufferFromUrl(gameInfo.headerURL);
    const profileBuffer = await getImageBufferFromUrl(userData.steamPFP);

    const base64_img = await sharp(tokenInfo.backgroundPath)
        .ensureAlpha()
        .composite([
            { input: tokenInfo.backgroundPath, left: 0, top: 0 },
            { input: gameBuffer, left: gamePos.x, top: gamePos.y },
            { input: tokenInfo.overlayPath, left: 0, top: 0 },
            { input: profileBuffer, left: userPos.x, top: userPos.y },
        ])
        .png()
        .toBuffer();

    return base64_img.toString('base64');
}
async function mergeAsGeneric(userData:UserSaveInfo, gameInfo:GameSaveInfo, tokenInfo:TokenType): Promise<string> {
    const base64_img = await mergeImages([
        { src: tokenInfo.backgroundPath, x: 0, y: 0 },
        { src: gameInfo.headerURL, x: gamePos.x, y: gamePos.y },
        { src: tokenInfo.overlayPath, x: 0, y: 0 },
        { src: userData.steamPFP, x: userPos.x, y: userPos.y },
    ], {
        Canvas: Canvas,
        Image: Image,
        quality: 1,
        format: 'image/png',
        width: overlayDim.width,
        height: overlayDim.height
    })
    return base64_img;
}

async function getImageBufferFromUrl(url:string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

function ensureAllImages() {
    for (const path of Object.values(overlayPaths)) {
        if (!fs.existsSync(path)) {
          throw new Error(`Image not found: ${path}`);
        }
    }
    for (const path of Object.values(backgroundPaths)) {
        if (!fs.existsSync(path)) {
          throw new Error(`Image not found: ${path}`);
        }
    }
}
function getTokenType(daysClean:number, tokensRecieved:number):TokenType|false {
    if (daysClean < 7) {
        return false;
    } else if (daysClean < 30) { // bronze
        if (tokensRecieved < 1)
            return {overlayPath: overlayPaths.bronze, backgroundPath: backgroundPaths.bronze, tokens: 1, daysClean:daysClean};
    } else if (daysClean < 365) {// silver
        if (tokensRecieved < 2)
            return {overlayPath: overlayPaths.silver, backgroundPath: backgroundPaths.silver, tokens: 2, daysClean:daysClean};
    } else { // gold
        if (tokensRecieved < 3)
            return {overlayPath: overlayPaths.gold, backgroundPath: backgroundPaths.gold, tokens: 3, daysClean:daysClean};
    }
    return false;
}

function daysPast(lastDate:Date):number {
    const timeDifference = Math.abs(lastDate.getTime() - new Date().getTime());
    const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
    return daysDifference;
}