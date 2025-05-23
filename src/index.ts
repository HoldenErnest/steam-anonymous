import { Client, Guild, GuildBasedChannel } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
import * as Modals from "./modals"
import * as Messenger from "./messenger"
import * as schedule from "./scheduler"

const client = new Client({
	intents: ["Guilds", "GuildMessages", "DirectMessages"],
});

client.once("ready", () => {
	console.log("[START] Bot ready.");
	Messenger.updateAllChannels();
	schedule.scheduleTokens();
});

client.on("guildCreate", async (guild) => {
	// every time the bot joins a new server, update that server to include all the commands
	await deployCommands({ guildId: guild.id });

	console.log(`New Server: ${guild.name}`);
	guild.channels.cache.every(channel => {
		console.log(`- ${channel.name} (${channel.id}) [${channel.type}]`);
		if (channel.type == 0) {
			console.log("Sending Welcome");
			Messenger.subscribeChannel(guild.id, channel);
			Messenger.sendWelcome(channel, guild.name);
			return false;
		}
		return true;
	});

});

client.on("interactionCreate", async (interaction) => {
	if (interaction.isModalSubmit()) {
		if (interaction.customId == "trackID")
			commands["track"].trackGameResponse(interaction);
		else if (interaction.customId == "untrackID")
			commands["untrack"].untrackGameResponse(interaction);
		else if (interaction.customId == "trackAssign")
			Modals.assignUserResponse(interaction);
	}
	if (!interaction.isCommand()) {
		return;
	}
	const { commandName } = interaction;
	if (commands[commandName as keyof typeof commands]) {
		commands[commandName as keyof typeof commands].execute(interaction);
	}
});

client.login(config.DISCORD_TOKEN);

// channel must be message type
export function channelFromID(channelID:string): GuildBasedChannel {
	return client.channels.cache.get(channelID) as GuildBasedChannel;
}