// Holden Ernest - 4/24/2025
// Command to untrack a game for a specific user

import { CommandInteraction, ModalSubmitInteraction, SlashCommandBuilder } from "discord.js";
import * as SteamManager from "../steam-manager";
import * as Modals from "../modals"

export const data = new SlashCommandBuilder()
    .setName("untrack")
    .setDescription("Remove a tracker from a game")
    .addUserOption(option => option.setName("user").setDescription('Target user'));

// run this command
export async function execute(interaction: CommandInteraction) {
	var user = interaction.user.displayName;
	const targetID = interaction.options.get("user")?.user?.id;
	const targetUser = interaction.options.get("user")?.user?.displayName;

	if (targetUser) {
		Modals.createTrackingForm(interaction, false, targetUser, targetID);
		return;
	}
	Modals.createTrackingForm(interaction, false);
}

// post user input EVENT
export async function untrackGameResponse(interaction: ModalSubmitInteraction) {
	await interaction.deferReply();
	var response = ""
	const steamID = interaction.fields.getTextInputValue('steamID_input')
	const steamGame = interaction.fields.getTextInputValue('game_input')
	const guildID = interaction.guildId!;

	// find user from ID
	var userData = await SteamManager.getSteamUserData(steamID);
	if (!userData || userData.hasOwnProperty("code")) {
		response = `User not found with ID: ${steamID}`;
		return interaction.editReply(response);
	}
	userData = userData as SteamManager.UserSaveInfo;
	
	const usernameString = `[${userData.steamUser}](${userData.steamURL})`

	// get app id from name
	const gameInfo = await SteamManager.getAppId(steamGame);
	if (gameInfo!.id < 0) {
		response = `Game **${steamGame}** not found, please try to match a phrase in the title`;
		return interaction.editReply(response);
	}

	if (SteamManager.userTracksGame(guildID, steamID, gameInfo!.id.toString())) {
		SteamManager.untrackUsersGame(guildID, steamID, gameInfo!.id.toString());
		response = `**${gameInfo!.name}** is no longer being tracked for ${usernameString}`;
	} else {
		response = `**${gameInfo!.name}** was never being tracked for ${usernameString}`;
	}

	return interaction.editReply(response);
}
