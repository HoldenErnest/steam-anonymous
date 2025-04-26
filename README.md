# Steam Anonymous

A Discord Bot that uses the Steam API to track registered users and hand out "chips" representing how long they were away from certain games. Dont fall back to old habbits, youre better than League.

## Commands
`/ping` - Test the conectivity of the bot

`/track` - Setup a tracker on a game for a specific steam user

`/track @user` - Attach a Steam ID to a user for ease of use. Future uses will fill out the Steam ID automatically

`/untrack` - Remove a tracker on a game for a specific steam user

`/untrack @user` - Remove a tracker on a game for the specified user (must have /track @user setup)

`/subscribe` - Subscribe your Guild to the current channel, all future messages will be sent here

<hr>

## Setup (UNTESTED)

 - Clone this repository
 - In the directory run `$ npm i`
 - Create a .env file and set the `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and `STEAM_KEY`

 ## Run

 - `$ npm run dev`
<hr>

 ## Images

![test1](./img/notes/steamA%20test.png)
![test2](./img/notes/steamA%20test2.png)


(Old vs New Tokens)
<img src="./img/notes/oldCopper.png" width=180px height=180px>
<img src="./img/notes/newGold.png" width=200px height=200px>