import { CommandInteraction, ModalSubmitInteraction, SlashCommandBuilder, ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import SteamAPI from 'steamapi';

export const data = new SlashCommandBuilder()
  .setName("track")
  .setDescription("Track a user");

export async function execute(interaction: CommandInteraction) {
    var user = interaction.user.displayName;

    createModelForm(interaction);
}

export async function responseModal(interaction: ModalSubmitInteraction) {
    const steamID = interaction.fields.getTextInputValue('steamID_input')
    const steamDesc = interaction.fields.getTextInputValue('desc_input')
    // TODO: check steam api to find the user. Store this in a database
    return interaction.reply("steamID: " + steamID);
}

async function createModelForm(interaction: CommandInteraction) {
    
    const modal = new ModalBuilder()
        .setCustomId('steamTrack')
        .setTitle('Track a steam user');

    const favoriteColorInput = new TextInputBuilder()
        .setCustomId('steamID_input')
        // The label is the prompt the user sees for this input
        .setLabel("Enter your Steam ID: ")
        // Short means only a single line of text
        .setStyle(TextInputStyle.Short);

    const hobbiesInput = new TextInputBuilder()
        .setCustomId('desc_input')
        .setLabel("Description: ")
        // Paragraph means multiple lines of text.
        .setStyle(TextInputStyle.Paragraph);

    // An action row only holds one text input,
    // so you need one action row per text input.
    const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);
    const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);

    // Add inputs to the modal
    // @ts-ignore
    modal.addComponents(firstActionRow, secondActionRow); //! I dont know why these are red!

    // Show the modal to the user
    await interaction.showModal(modal);
}