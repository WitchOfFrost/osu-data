import axios from "axios";
import { mariadbWorker } from "./mariadb.mjs";
import { readFile } from "./file.mjs";
import { config } from "../index.mjs";

let queue = []

export async function osuMain() {
    let token;
    let entries = 0;
    let refresh = 0;
    let retries = {
        osu: {
            score: 0
        }, mania: {
            score: 0
        }, taiko: {
            score: 0
        }, fruits: {
            score: 0
        }
    };

    setInterval(importQueueLengthConsoleLog, 1000 * 60);

    function importQueueLengthConsoleLog() {
        console.log("Current Import Queue Length: " + queue.length);
    }

    setInterval(processQueue, 1000);

    function sleep(milliseconds) {
        const date = Date.now();
        let currentDate = null;
        do {
            currentDate = Date.now();
        } while (currentDate - date < milliseconds);
    }

    if (config.settings.firstRun === true) {
        console.log("firstRun is turned on, please turn it off in the config now. Fetching all supported datasets of all modes immediately.");
        await mariadbWorker.runSqlCreateTable('scoreranking_osu', '`rank` INT(11) NOT NULL, `user_id` INT NULL DEFAULT NULL, `username` VARCHAR(255) NULL DEFAULT NULL, `score` BIGINT(20) NOT NULL DEFAULT 0, PRIMARY KEY(`rank`)')
        fullRankingsUpdate("osu", "score", 1);
        await mariadbWorker.runSqlCreateTable('scoreranking_mania', '`rank` INT(11) NOT NULL, `user_id` INT NULL DEFAULT NULL, `username` VARCHAR(255) NULL DEFAULT NULL, `score` BIGINT(20) NOT NULL DEFAULT 0, PRIMARY KEY(`rank`)')
        fullRankingsUpdate("mania", "score", 1);
        await mariadbWorker.runSqlCreateTable('scoreranking_taiko', '`rank` INT(11) NOT NULL, `user_id` INT NULL DEFAULT NULL, `username` VARCHAR(255) NULL DEFAULT NULL, `score` BIGINT(20) NOT NULL DEFAULT 0, PRIMARY KEY(`rank`)')
        fullRankingsUpdate("taiko", "score", 1);
        await mariadbWorker.runSqlCreateTable('scoreranking_fruits', '`rank` INT(11) NOT NULL, `user_id` INT NULL DEFAULT NULL, `username` VARCHAR(255) NULL DEFAULT NULL, `score` BIGINT(20) NOT NULL DEFAULT 0, PRIMARY KEY(`rank`)')
        fullRankingsUpdate("fruits", "score", 1);
    }

    if (config.settings.tryCreateTable === true) {
        console.log("tryCreateTable is turned on, will attempt to create tables.");
        await mariadbWorker.runSqlCreateTable('scoreranking_osu', '`rank` INT(11) NOT NULL, `user_id` INT NULL DEFAULT NULL, `username` VARCHAR(255) NULL DEFAULT NULL, `score` BIGINT(20) NOT NULL DEFAULT 0, PRIMARY KEY(`rank`)')
        await mariadbWorker.runSqlCreateTable('scoreranking_mania', '`rank` INT(11) NOT NULL, `user_id` INT NULL DEFAULT NULL, `username` VARCHAR(255) NULL DEFAULT NULL, `score` BIGINT(20) NOT NULL DEFAULT 0, PRIMARY KEY(`rank`)')
        await mariadbWorker.runSqlCreateTable('scoreranking_taiko', '`rank` INT(11) NOT NULL, `user_id` INT NULL DEFAULT NULL, `username` VARCHAR(255) NULL DEFAULT NULL, `score` BIGINT(20) NOT NULL DEFAULT 0, PRIMARY KEY(`rank`)')
        await mariadbWorker.runSqlCreateTable('scoreranking_fruits', '`rank` INT(11) NOT NULL, `user_id` INT NULL DEFAULT NULL, `username` VARCHAR(255) NULL DEFAULT NULL, `score` BIGINT(20) NOT NULL DEFAULT 0, PRIMARY KEY(`rank`)')
        await mariadbWorker.runSqlCreateTable('scores', "`score_id` BIGINT(20) NOT NULL, `user_id` INT(11) NOT NULL, `beatmap_id` INT(11) NOT NULL, `score` INT(11) NOT NULL, `count300` INT(11) NOT NULL, `count100` INT(11) NOT NULL, `count50` INT(11) NOT NULL, `countmiss` INT(11) NOT NULL, `combo` INT(11) NOT NULL, `perfect` VARCHAR(5) NOT NULL COLLATE 'utf8mb3_general_ci', `enabled_mods` INT(11) NOT NULL, `date_played` VARCHAR(19) NOT NULL COLLATE 'utf8mb3_general_ci', `rank` VARCHAR(2) NOT NULL COLLATE 'utf8mb3_general_ci', `pp` DECIMAL(11,6) NOT NULL, `replay_available` VARCHAR(5) NOT NULL COLLATE 'utf8mb3_general_ci', INDEX `user_id` (`user_id`) USING BTREE, UNIQUE INDEX `score_id` (`score_id`) USING BTREE")
    }

    if (config.settings.autoUpdate === true) {
        let pass = -1;

        async function aU() {
            pass++

            switch (pass) {
                default:
                case 0:
                    if (config.settings.enabledFetches.indexOf("osuScore") > -1) {
                        await mariadbWorker.runSqlCreateTable('scoreranking_osu', '`rank` INT(11) NOT NULL, `user_id` INT NULL DEFAULT NULL, `username` VARCHAR(255) NULL DEFAULT NULL, `score` BIGINT(20) NOT NULL DEFAULT 0, PRIMARY KEY(`rank`)')
                        console.log("Auto Update enabled, fetching osu.score");
                        fullRankingsUpdate("osu", "score", 1);
                    }
                    break;
                case 1:
                    if (config.settings.enabledFetches.indexOf("maniaScore") > -1) {
                        await mariadbWorker.runSqlCreateTable('scoreranking_mania', '`rank` INT(11) NOT NULL, `user_id` INT NULL DEFAULT NULL, `username` VARCHAR(255) NULL DEFAULT NULL, `score` BIGINT(20) NOT NULL DEFAULT 0, PRIMARY KEY(`rank`)')
                        console.log("Auto Update enabled, fetching mania.score");
                        fullRankingsUpdate("mania", "score", 1);
                    }
                    break;
                case 2:
                    if (config.settings.enabledFetches.indexOf("taikoScore") > -1) {
                        await mariadbWorker.runSqlCreateTable('scoreranking_taiko', '`rank` INT(11) NOT NULL, `user_id` INT NULL DEFAULT NULL, `username` VARCHAR(255) NULL DEFAULT NULL, `score` BIGINT(20) NOT NULL DEFAULT 0, PRIMARY KEY(`rank`)')
                        console.log("Auto Update enabled, fetching taiko.score");
                        fullRankingsUpdate("taiko", "score", 1);
                    }
                    break;
                case 3:
                    if (config.settings.enabledFetches.indexOf("fruitsScore") > -1) {
                        await mariadbWorker.runSqlCreateTable('scoreranking_fruits', '`rank` INT(11) NOT NULL, `user_id` INT NULL DEFAULT NULL, `username` VARCHAR(255) NULL DEFAULT NULL, `score` BIGINT(20) NOT NULL DEFAULT 0, PRIMARY KEY(`rank`)')
                        console.log("Auto Update enabled, fetching fruits.score");
                        fullRankingsUpdate("fruits", "score", 1);
                    }
                    break;
            }

            if (pass > 3) {
                pass = 0;
            };
        };
        aU();
        setInterval(aU, 1000 * 60 * config.settings.updateInterval);
    } else {
        console.log("Auto update disabled in config.");
    }

    async function refreshToken() {
        return new Promise((resolve, reject) => {
            axios({
                url: "https://osu.ppy.sh/oauth/token",
                method: "post",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                data: {
                    "grant_type": "client_credentials",
                    "client_id": config.osu.id,
                    "client_secret": config.osu.secret,
                    "scope": "public"
                }
            }).then(data => {
                refresh = Date.now() + (data.data.expires_in * 1000);
                resolve('Bearer ' + data.data.access_token);
            }).catch(err => {
                reject(err);
            });
        });
    }

    async function fullRankingsUpdate(mode, type, cursor) {
        if (Date.now() > refresh - 5 * 60 * 1000) {
            token = await refreshToken();
        }

        let osuAPI = axios.create({ baseURL: 'https://osu.ppy.sh/api/v2', headers: { 'Authorization': token }, json: true });

        osuAPI.get('/rankings/' + mode + '/' + type, { data: { cursor: { page: cursor } } }).then(async res => {
            let i = 0;

            console.log("Inserting " + res.data.ranking.length + " Entries into the db");

            await res.data.ranking.forEach(async elem => {
                i++
                entries++
                await mariadbWorker.runSqlReplace(type + 'ranking_' + mode, `${i + 50 * (cursor - 1)}, ${elem.user.id}, "${elem.user.username}", ${elem.ranked_score}`)
            });

            if (res.data.cursor != null) {
                cursor = res.data.cursor.page;
                sleep(1000);
                fullRankingsUpdate(mode, type, cursor);
                retries[mode][type] = 0;
                console.log("Inserted a total of " + entries + " Into the db " + type + 'ranking_' + mode);
            } else {
                console.log("Finished iterating for a total of " + entries + " Entries!");
                entries = entries - 10000;
            }
        }).catch(err => {
            if (retries[mode][type] < 4) {
                console.log(err);
                console.log("Retry: " + retries[mode][type]);
                retries[mode][type]++
                sleep(1000 * (retries[mode][type] * 10));
                fullRankingsUpdate(mode, type, cursor);
            } else {
                console.log("Max retries reached, giving up.");
                retries[mode][type] = 0;
            }
        });
    }

    async function calcModEnum(mods) {
        return new Promise(async (resolve) => {
            let calc = 0;
            mods.forEach(mod => {
                switch (mod) {
                    case "NF":
                        calc = calc + 1
                        break;
                    case "EZ":
                        calc = calc + 2
                        break;
                    case "HD":
                        calc = calc + 8
                        break;
                    case "HR":
                        calc = calc + 16
                        break;
                    case "DT":
                        calc = calc + 64
                        break;
                    case "HT":
                        calc = calc + 256
                        break;
                    case "NC":
                        calc = calc + 576
                        break;
                    case "FL":
                        calc = calc + 1024
                        break;
                    case "SO":
                        calc = calc + 4096
                        break;
                    case "SD":
                        calc = calc + 32
                        break;
                    case "PF":
                        calc = calc + 16416
                        break;
                };
            });
            resolve(calc);
        });
    };

    async function processQueue() {
        if (queue.length > 0) {
            let score = queue[0];
            queue.shift();

            if (Date.now() > refresh - 5 * 60 * 1000) {
                token = await refreshToken();
            }

            let osuAPI = axios.create({ baseURL: 'https://osu.ppy.sh/api/v2', headers: { 'Authorization': token }, json: true });

            osuAPI.get('/scores/osu/' + score.score_id).then(async res => {
                let apiFormatted = { "score_id": String(res.data.id), "user_id": String(res.data.user_id), "beatmap_id": String(res.data.beatmap.id), "score": String(res.data.score), "count300": String(res.data.statistics.count_300), "count100": String(res.data.statistics.count_100), "count50": String(res.data.statistics.count_50), "countmiss": String(res.data.statistics.count_miss), "combo": String(res.data.max_combo), "perfect": String(Number(res.data.perfect)), "enabled_mods": String(await calcModEnum(res.data.mods)), "date_played": String(res.data.created_at.slice(0, 19).split("T").join(" ")), "rank": String(res.data.rank), "pp": String(res.data.pp), "replay_available": String(Number(res.data.replay)) }
                if (JSON.stringify(score) == JSON.stringify(apiFormatted)) {
                    await mariadbWorker.runSqlQueryPermanentConnection(`INSERT INTO scores (score_id, user_id, beatmap_id, score, count300, count100, count50, countmiss, combo, perfect, enabled_mods, date_played, rank, pp, replay_available) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) LIMIT 1`, [score.score_id, score.user_id, score.beatmap_id, score.score, score.count300, score.count100, score.count50, score.countmiss, score.combo, score.perfect, score.enabled_mods, score.date_played, score.rank, score.pp, score.replay_available]).then(data => {
                        console.log(data);
                    });
                };
            }).catch(err => {
                if (err.response.status == 404) return;

                console.log(err);
            });
        }
    }

}

export async function validateScores(path) {
    return new Promise(async (resolve) => {

        let parsedCSV = await readFile.parseCSV(path);

        parsedCSV.forEach(async score => {
            await mariadbWorker.runSqlQueryPermanentConnection(`SELECT * FROM scores WHERE score_id=? LIMIT 1`, [score.score_id]).then(data => {
                if (data[0] == undefined) {
                    queue.push(score);
                }
            });
        });
        resolve(queue.length);
    });
}