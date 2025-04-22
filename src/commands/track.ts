import { CommandInteraction, ModalSubmitInteraction, SlashCommandBuilder, ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import SteamAPI, { AppBase } from 'steamapi';
import dotenv from "dotenv";
import { dbSaveUser, dbGetUserFromSteam, dbGetSteamIDFromDiscord, dbSaveGameStats, dbUserOwnsGame, dbUpdateAllGames, dbGamesEmpty, dbGetGameID } from "../database";

dotenv.config();
const STEAM_KEY = process.env.STEAM_KEY as string;

export const data = new SlashCommandBuilder()
    .setName("track")
    .setDescription("Setup a user to get tracked")
    .addUserOption(option => option.setName("user").setDescription('Target user'))

export async function execute(interaction: CommandInteraction) {
    var user = interaction.user.displayName;
    const targetID = interaction.options.get("user")?.user?.id;
    const targetUser = interaction.options.get("user")?.user?.displayName;

    if (targetUser) {
        createForm(interaction, targetUser, targetID);
        return;
    }
    createForm(interaction);
}

export async function responseModalAddID(interaction: ModalSubmitInteraction) {
    await interaction.deferReply();
    var response = ""
    const steamID = interaction.fields.getTextInputValue('steamID_input')
    const discordUser = interaction.fields.getTextInputValue('username_input')
    const steam = new SteamAPI(STEAM_KEY);
    const userData = await saveUser(steamID, discordUser, steam);
    if (userData) {
        await interaction.editReply(`<@${discordUser}> is now associated with an ID.`);
    } else {
        await interaction.editReply(`Could not find the Steam ID: ${steamID}`);
    }
}

export async function responseModal(interaction: ModalSubmitInteraction) {
    await interaction.deferReply();
    var response = ""
    const steamID = interaction.fields.getTextInputValue('steamID_input')
    const steamGame = interaction.fields.getTextInputValue('game_input')
    const steam = new SteamAPI(STEAM_KEY);

    // find user from ID
    const userData = await getSteamUserData(steamID, steam);
    if (!userData) {
        response = `User not found with ID: ${steamID}`;
        return interaction.editReply(response);
    }
    const usernameString = `[${userData.steamUser}](${userData.steamURL})`
    // get app id from name
    const gameInfo = await getAppId(steamGame, steam);
    if (gameInfo!.id < 0) {
        response = `Game **${steamGame}** not found, please try to match a phrase in the title`;
        return interaction.editReply(response);
    }
    // get details about the game
    const gameDetails = await getUserGameStats(steamID, gameInfo!.id, steam);
    if (gameDetails) {
        response = `**${gameInfo?.name}** is now being tracked for ${usernameString}`
    } else {
        response = `${usernameString} does not own **'${gameInfo?.name}'**`;
    }

    return interaction.editReply(response);
}

async function createForm(interaction: CommandInteraction, discordName?:string, discordID?:string) {
    var preText = "";
    var title = "Track a game";
    if (discordName) {
        const steamID = await dbGetSteamIDFromDiscord(discordID!);
        if (steamID) { // if user in database
            preText = steamID.toString();
            title = `Tracking: ${discordName}`;
        } else {
            return await createIDForm(interaction, discordName!, discordID!);
        }
    }

    const modal = new ModalBuilder()
        .setCustomId('trackID')
        .setTitle(title);

    const steamIDInput = new TextInputBuilder()
        .setCustomId('steamID_input')
        .setLabel("Steam ID: ")
        .setPlaceholder('Enter a Steam ID..')
        .setValue(preText)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const gameInput = new TextInputBuilder()
        .setCustomId('game_input')
        .setLabel("Game: ")
        .setPlaceholder('Enter a game to track..')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
    // add fields to modal
    const firstActionRow = new ActionRowBuilder().addComponents(steamIDInput);
    const secondActionRow = new ActionRowBuilder().addComponents(gameInput);

    // Add inputs to the modal
    // @ts-ignore
    modal.addComponents(firstActionRow, secondActionRow); //! I dont know why these are red!

    // Show the modal to the user
    await interaction.showModal(modal);
}
async function createIDForm(interaction: CommandInteraction, discordName:string, discordID:string) {
    var preName = discordID;
    var title = `Assign ID: ${discordName}`;

    const modal = new ModalBuilder()
        .setCustomId('trackAdd')
        .setTitle(title);

    const steamIDInput = new TextInputBuilder()
        .setCustomId('username_input')
        .setLabel("Discord ID: ")
        .setPlaceholder('Enter a discord user..')
        .setValue(preName)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const gameInput = new TextInputBuilder()
        .setCustomId('steamID_input')
        .setLabel("Steam ID: ")
        .setPlaceholder('Enter a Steam ID..')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
    // add fields to modal
    const firstActionRow = new ActionRowBuilder().addComponents(steamIDInput);
    const secondActionRow = new ActionRowBuilder().addComponents(gameInput);

    // Add inputs to the modal
    // @ts-ignore
    modal.addComponents(firstActionRow, secondActionRow); //! I dont know why these are red!

    // Show the modal to the user
    await interaction.showModal(modal);
}
async function getAppId(gameName: string, steam:SteamAPI) {
    if (!gameName) return;
    
    //const re = new RegExp(`\"appid\":(\d+)[^{}]*\"name\":\"([^\"]*${gameName}[^\"]*)\"`, "gm"); // IF you needed to go through the raw string
    const res = await steam.getAppList();
    if (dbGamesEmpty())
        await dbUpdateAllGames(res);

    var match = await dbGetGameID(gameName)

    return match;
}

// returns if the user owns the game, and returns the detailed game info if so.
async function userOwnsGame(steamID:string, gameID:number, steam:SteamAPI) {
    if (!steamID || !gameID) return;
    
    const dbOwns = await dbUserOwnsGame(steamID, gameID.toString());
    if (dbOwns) return dbOwns;

    try {
        const res = await steam.getUserOwnedGames(steamID);

        const result = res.find(obj => {
            return obj["game"]["id"] === gameID
        });
        return result;
    } catch (e) {
        console.error((e as Error).name);
    }
    return false;
}
// returns the game stats object for a specific user.
async function getUserGameStats(steamID:string, gameID:number, steam:SteamAPI) {
    if (!steamID || !gameID) return;
    const gameDetails = await userOwnsGame(steamID, gameID, steam);
    if (!gameDetails) return false;

    try {
        const res = await steam.getUserStats(steamID, gameID);

        const model = {
            gameName: res.game,
            minutes: gameDetails.minutes,
            lastPlayed: gameDetails.lastPlayedTimestamp,
            type: gameDetails.type,
            stats: res.stats ? res.stats : []
        }
        // save to db
        await dbSaveGameStats(steamID, gameID.toString(), model);
        return model;
    } catch (e) {
        console.error(e);
        return false;
    }
    
}
// returns the user data from an ID
async function getSteamUserData(steamID:string, steam:SteamAPI, discordUser?:string) {
    if (!Number(steamID)) return false;
    
    // check if user in the db
    const gameDetails = await dbGetUserFromSteam(steamID);
    if (gameDetails && !discordUser) return gameDetails;

    try {
        const data = await steam.getUserSummary(steamID);
        const model = {
            steamUser: data.nickname,
            steamURL: data.profileURL,
            discordUser: discordUser!
        }

        await dbSaveUser(steamID, model.steamUser, model.discordUser, model.steamURL);
        return model;
    } catch (e){
        return false;
    }
    
}
async function saveUser(steamID:string, discordUser:string, steam:SteamAPI) {
    return await getSteamUserData(steamID, steam, discordUser);
}