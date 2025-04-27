// Holden Ernest - 4/26/2025
// Generate the token images to send as rewards

import mergeImages from "merge-images"
import { GameSaveInfo, UserSaveInfo } from "./steam-manager";
import { Canvas, Image } from "canvas"
import fs from "fs";

const overlayPaths = {
    gold: './img/tokens/front/gold.png',
    silver: './img/tokens/front/silver.png',
    bronze: './img/tokens/front/bronze.png'
}
const backgoundPaths = {
    black: './img/tokens/back/black.png'
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
    x: (overlayDim.width/2 - gameDim.width/2),
    y: (overlayDim.height/2 - gameDim.height/2)
}
const pfpOffset = 100;
const userPos = {
    x: (overlayDim.width - userDim.width - pfpOffset),
    y: (overlayDim.height - userDim.height - pfpOffset)
}

export async function generateToken(userData:UserSaveInfo, gameInfo:GameSaveInfo): Promise<string | false> {

    //TODO : only generate token if the image should be generated.
    return await getImageBase64(userData, gameInfo);
}

async function getImageBase64(userData:UserSaveInfo, gameInfo:GameSaveInfo) : Promise<string | false> {
    try {

        ensureAllImages();

        const base64_img = await mergeImages([
            { src: backgoundPaths.black, x: 0, y: 0 },
            { src: gameInfo.headerURL, x: gamePos.x, y: gamePos.y },
            { src: overlayPaths.gold, x: 0, y: 0 },
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
    } catch (e) {
        console.error("imageGen: " + e);
    }
    return false;
    
}
function ensureAllImages() {
    for (const path of Object.values(overlayPaths)) {
        if (!fs.existsSync(path)) {
          throw new Error(`Image not found: ${path}`);
        }
    }
}