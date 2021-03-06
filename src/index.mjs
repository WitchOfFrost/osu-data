import { readFile } from "./modules/file.mjs";
import { apiMain } from "./api/express.mjs";
import { osuMain } from "./modules/osu.mjs";
import { createPermanentConnection } from "./modules/mariadb.mjs"

export const config = JSON.parse(readFile.default("./config.json"));

async function main() {
    apiMain();
    osuMain();
    createPermanentConnection();
}
main();