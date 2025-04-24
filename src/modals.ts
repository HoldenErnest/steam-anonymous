// Holden Ernest - 4/24/2025
// Default Modals to be reused on command interactions

import { CommandInteraction, ModalSubmitInteraction, SlashCommandBuilder, ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { getSteamIDFromDiscord, saveUser } from "./steam-manager";

export async function createTrackingForm(interaction: CommandInteraction, tracking:boolean, discordName?:string, discordID?:string) {
	var preText = "";
    var title = tracking ? "Track a game" : "Untrack a game";
    var customID =  tracking ? 'trackID' : 'untrackID'
    if (discordName) {
        const steamID = await getSteamIDFromDiscord(discordID!);
        if (steamID) { // if user in database
            preText = steamID.toString();
            title = tracking ? `Tracking: ${discordName}` : `Untracking: ${discordName}`;
        } else {
            return await createAssignForm(interaction, discordName!, discordID!);
        }
    }

    const modal = new ModalBuilder()
        .setCustomId(customID)
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

export async function createAssignForm(interaction: CommandInteraction, discordName:string, discordID:string) {
    var preName = discordID;
    var title = `Assign ID: ${discordName}`;
    
    const modal = new ModalBuilder()
        .setCustomId('trackAssign')
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

// assign represents if you want to assign the ID or remove the ID
export async function assignUserResponse(interaction: ModalSubmitInteraction, assign?:boolean) {
    await interaction.deferReply();
    var response = ""
    const steamID = interaction.fields.getTextInputValue('steamID_input')
    const discordUser = interaction.fields.getTextInputValue('username_input')
    const userData = await saveUser(steamID, discordUser);
    if (userData) {
        await interaction.editReply(`<@${discordUser}> is now associated with an ID.`);
    } else {
        await interaction.editReply(`Could not find the Steam ID: ${steamID}`);
    }
}