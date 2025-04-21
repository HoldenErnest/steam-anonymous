import { CommandInteraction, ModalSubmitInteraction, SlashCommandBuilder, ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import SteamAPI, { AppBase } from 'steamapi';
import dotenv from "dotenv";
import { distance } from "closest-match";

dotenv.config();
const STEAM_KEY = process.env.STEAM_KEY as string;

export const data = new SlashCommandBuilder()
  .setName("track")
  .setDescription("Track a user");

export async function execute(interaction: CommandInteraction) {
    var user = interaction.user.displayName;
    // TODO: /track @user      keep a db for each user with their ids
    createModelForm(interaction);
}

export async function responseModal(interaction: ModalSubmitInteraction) {
    interaction.deferReply();
    const steamID = interaction.fields.getTextInputValue('steamID_input')
    const steamGame = interaction.fields.getTextInputValue('game_input')
    const steam = new SteamAPI(STEAM_KEY);
    // TODO: check steam api to find the user. Store this in a database
    const gameInfo = await getAppId(steamGame, steam);

    var res = ""
    if (gameInfo!.id >= 0) {
        res = `'${gameInfo?.name}' is now being tracked for user ${steamID}`
    } else {
        res = `Game '${steamGame}' not found, please try to match a phrase in the title`;
    }

    return interaction.editReply(res);
}

async function createModelForm(interaction: CommandInteraction) {
    
    const modal = new ModalBuilder()
        .setCustomId('steamTrack')
        .setTitle('Track a Game');

    const favoriteColorInput = new TextInputBuilder()
        .setCustomId('steamID_input')
        // The label is the prompt the user sees for this input
        .setLabel("Steam ID: ")
        // Short means only a single line of text
        .setStyle(TextInputStyle.Short);

    const hobbiesInput = new TextInputBuilder()
        .setCustomId('game_input')
        .setLabel("Game to track: ")
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

async function getAppId(gameName: string, steam:SteamAPI) {
    if (!gameName) return;
    
    //const re = new RegExp(`\"appid\":(\d+)[^{}]*\"name\":\"([^\"]*${gameName}[^\"]*)\"`, "gm"); // IF you needed to go through the raw string
    const res = await steam.getAppList();

    var match = bestDistanceGame(gameName, res)

    //TODO: make sure its not dlc? if it is I dont know what to do
    //var gameInfo = await steam.getGameDetails(match.id)
    //if (gameInfo.type == "dlc") return;

    return match;
}

function bestDistanceGame(target:string, arr:AppBase[]) {
    var match = {
        name: "",
        id: -1,
        distance: 10 // Change this for minimum distance
    }

    arr.forEach((game) => {
        var d = distance(target,game.name);
        if (d < match.distance) {
            // update the new closest match
            match.distance = d;
            match.name = game.name;
            match.id = game.appid;
        }
    });
    return match;
}