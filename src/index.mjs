import { readFile } from "./modules/file.mjs";
import { apiMain } from "./api/express.mjs";
import { osuMain } from "./modules/osu.mjs";

export const config = JSON.parse(readFile.default("./src/config.json"));

async function main() {
    apiMain();
    osuMain();
}
main();