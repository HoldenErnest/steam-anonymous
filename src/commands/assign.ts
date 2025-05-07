// Holden Ernest - 5/7/2025
// Command to associate a discord user from a steam ID

import { CommandInteraction, ModalSubmitInteraction, SlashCommandBuilder } from "discord.js";
import * as SteamManager from "../steam-manager";
import * as Modals from "../modals"

export const data = new SlashCommandBuilder()
    .setName("assign")
    .setDescription("Assign a Discord user to a Steam ID")
    .addUserOption(option => option.setName("user").setDescription('Target User'));

// run this command
export async function execute(interaction: CommandInteraction) {
	var user = interaction.user.displayName;
	const targetID = interaction.options.get("user")?.user?.id;
	const targetUser = interaction.options.get("user")?.user?.displayName;

	if (targetUser) {
		Modals.createAssignForm(interaction, targetUser, targetID!);
		return;
	} else {
		await interaction.reply("Command requires a specified target user");
	}
}