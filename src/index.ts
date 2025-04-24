import { Client } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
import * as Modals from "./modals"

const client = new Client({
  intents: ["Guilds", "GuildMessages", "DirectMessages"],
});

client.once("ready", () => {
  console.log("[START] Bot ready.");
});

client.on("guildCreate", async (guild) => {
  // every time the bot joins a new server, update that server to include all the commands
  await deployCommands({ guildId: guild.id });
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