import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { subscribeChannel, sendMessageToAll } from "../messenger";

export const data = new SlashCommandBuilder()
    .setName("subscribe")
    .setDescription("Set my message channel");

export async function execute(interaction: CommandInteraction) {
    // intentionally not await? dont wait for all channels to update before you can 
    subscribeChannel(interaction.guildId!, interaction.channelId);
    return interaction.reply("You will now recieve messages in this channel");
}