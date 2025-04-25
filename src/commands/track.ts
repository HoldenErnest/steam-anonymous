// Holden Ernest - 4/24/2025
// Command to track a game for a specific user

import { CommandInteraction, ModalSubmitInteraction, SlashCommandBuilder } from "discord.js";
import * as Modals from "../modals"
import * as SteamManager from "../steam-manager"

export const data = new SlashCommandBuilder()
    .setName("track")
    .setDescription("Setup a game to get tracked for a certain user")
    .addUserOption(option => option.setName("user").setDescription('Target user'))

export async function execute(interaction: CommandInteraction) {
    var user = interaction.user.displayName;
    const targetID = interaction.options.get("user")?.user?.id;
    const targetUser = interaction.options.get("user")?.user?.displayName;

    if (targetUser) {
        Modals.createTrackingForm(interaction, true, targetUser, targetID);
        return;
    }
    Modals.createTrackingForm(interaction, true);
}

export async function trackGameResponse(interaction: ModalSubmitInteraction) {
    await interaction.deferReply();
    var response = ""
    const steamID = interaction.fields.getTextInputValue('steamID_input')
    const steamGame = interaction.fields.getTextInputValue('game_input')
    const guildID = interaction.guildId!;
    
    // find user from ID
    const userData = await SteamManager.getSteamUserData(steamID);
    if (!userData) {
        response = `User not found with ID: ${steamID}`;
        return interaction.editReply(response);
    }
    const usernameString = `[${userData.steamUser}](${userData.steamURL})`
    // get app id from name
    const gameInfo = await SteamManager.getAppId(steamGame);
    if (gameInfo!.id < 0) {
        response = `Game **${steamGame}** not found, please try to match a phrase in the title`;
        return interaction.editReply(response);
    }

    if (SteamManager.userTracksGame(guildID, steamID, gameInfo!.id.toString())) {
        response = `**${gameInfo!.name}** is already being tracked for ${usernameString}`;
        return interaction.editReply(response);
    }

    // get details about the game
    const gameDetails = await SteamManager.getUserGameStats(guildID, steamID, gameInfo!.id);
    if (gameDetails.hasOwnProperty("code")) {
        //@ts-ignore
        switch (gameDetails.code) {
            case 0:
                response = `${usernameString} does not own **'${gameInfo?.name}'**`;
                break;
            case 1:
                response = `${usernameString} has a private profile`;
                break;
            case 4:
                response = `API Error getting stats for ${usernameString}`;
                break;
            default:
                response = `Problem fetching user info :(`;
                break;
        }
    } else {
        response = `**${gameInfo?.name}** is now being tracked for ${usernameString}`
    }

    return interaction.editReply(response);
}



