import dotenv from "dotenv";

dotenv.config();

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, STEAM_KEY } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  throw new Error("Missing Discord Bot secrets .env");
}
if (!STEAM_KEY) {
  throw new Error("Missing Steam key .env");
}

export const config = {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  STEAM_KEY
};