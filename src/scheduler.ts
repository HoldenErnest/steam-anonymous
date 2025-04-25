import * as DB from "./database"
import * as Messenger from "./messenger"
import cron from "node-cron";


export async function scheduleChips() {
    // CHIPS are scheduled to run at 9AM and 9PM every day
    var task = cron.schedule('* 9,21 * * *', () =>  {
        console.log('will execute every minute until stopped');

        //TODO: go through every guild
        //TODO: go through every user
        //TODO: go through every game
        //TODO: check Steam API and note the differences.

        //TODO: ^^ go through every user then getUserRecentGames()?
        //TODO: since I need the icon_url anyway.

        // Image generation.
        /*
        7 days: bronze
        30 days: silver
        365 days: gold
        */

        // Algoritm for commentary
        /*
        total < 100 && timeDelta > 5 :  "Slow down, you played quite a few hours"
        total >= 100 && timeDelta > 4 : "Youre really invested in that game"
        total >= 200 && 
        */
    });
}