process.chdir(`${process.cwd()}/src`);

import express from 'express';
import { expressUploader } from "./expressUpload.cjs";
import morgan from 'morgan';

import { config } from '../index.mjs';
import { mariadbWorker } from "../modules/mariadb.mjs";

const api = express();

function pre(api) {
    expressUploader(api);
} pre(api);

function parseMode(mode, m) {
    let resolveMode = "";

    if (m == undefined) {
        if (["osu", "mania", "taiko", "fruits"].includes(mode) == -1 || mode == undefined) {
            resolveMode = "osu";
        } else {
            resolveMode = mode;
        };
    } else {
        switch (m) {
            case "0":
                resolveMode = "osu";
                break;
            case "1":
                resolveMode = "taiko";
                break;
            case "2":
                resolveMode = "fruits";
                break;
            case "3":
                resolveMode = "mania";
                break;
            default:
                resolveMode = "osu";
                break;

        }
    };
    return resolveMode;
};

export async function apiMain() {

    if (["tiny", "dev"].indexOf(config.api.logging) > -1) {
        api.use(morgan(config.api.logging));
    }

    api.listen(config.api.port, () => {
        console.log("Api running on port " + config.api.port);
    });

    api.get('/rank/*', async (req, res) => {
        req.query.mode = await parseMode(req.query.mode, req.query.m);

        if (["score", "charts", "country", "performance"].includes(req.query.type) == -1 || req.query.type == undefined) {
            req.query.type = "score"
        };

        await mariadbWorker.runSqlQueryPermanentConnection(`SELECT * FROM ${req.query.type}ranking_${req.query.mode} WHERE rank=? LIMIT 1`, [req.path.split("/").pop()]).then(data => {
            if (data[0] == undefined) {
                res.status(200);
                res.json([{ rank: 0, user_id: 0, username: 0, score: 0 }])
            } else {
                res.status(200);
                res.json([data[0]]);
            }
        });
    });

    api.get('/u/*', async (req, res) => {

        req.query.mode = await parseMode(req.query.mode, req.query.m);

        if (["score", "charts", "country", "performance"].includes(req.query.type) == -1 || req.query.type == undefined) {
            req.query.type = "score"
        };

        if (["username", "user_id"].includes(req.query.s) == -1 || req.query.s == undefined) {
            req.query.s = "user_id"
        };

        await mariadbWorker.runSqlQueryPermanentConnection(`SELECT * FROM ${req.query.type}ranking_${req.query.mode} WHERE ${req.query.s}=? LIMIT 1`, [req.path.split("/").pop()]).then(data => {
            if (data[0] == undefined) {
                res.status(200);
                res.json([{ rank: 0, user_id: 0, username: 0, score: 0 }])
            } else {
                res.status(200);
                res.json([data[0]]);
            }
        });
    });

    api.get('/rankings', async (req, res) => {

        req.query.mode = await parseMode(req.query.mode, req.query.m);

        if (["score", "charts", "country", "performance"].includes(req.query.type) == -1 || req.query.type == undefined) {
            req.query.type = "score"
        };

        if (req.query.page > 200 || req.query.page < 1 || req.query.page == undefined || isNaN(req.query.page)) {
            req.query.page = 1
        };

        await mariadbWorker.runSqlQuery(`SELECT * FROM ${req.query.type}ranking_${req.query.mode} LIMIT 50 OFFSET ${(req.query.page - 1) * 50}`).then(data => {
            let i = 0;
            let prep = {};

            while (i < 51) {
                prep[i] = data[i];
                i++
            }

            res.status(200);
            res.json(prep)
        });
    });

    api.get('/osuprofile/version', async (req, res) => {
        res.status(200);
        res.json({ version: config.api.osuprofileVersion })
    });

    api.post('/import', async (req, res) => {
        let sentToken = req.headers["x-access-token"] || req.headers["authorization"];

        if (config.api.postAuth == true) {
            if (!sentToken) {
                res.status(401);
                res.json({ error: "Access denied. No token provided." });
                return;
            } else if (sentToken != config.api.token) {
                res.status(403);
                res.json({ error: "Invalid token." });
                return;
            };
        };

        if (!req.files) {
            res.status(400);
            res.json({ error: "No file uploaded." });
            return;
        } else if (!req.query.id) {
            res.status(400);
            res.json({ error: "Please provide a user id." });
            return;
        } else {
            let file = req.files.csv;
            let fileExt = file.name.split(".").pop();
            let fileName = req.query.id;
            let path = "" + process.cwd().replaceAll("\\", "/") + `/api/cache/${fileName}.${fileExt}`

            if (["csv"].indexOf(fileExt) < 0) {
                res.status(400);
                res.json({ error: "Unsupported file-type." });
                return;
            };

            file.mv(`./api/cache/${fileName}.${fileExt}`);

            mariadbWorker.runSqlQuery(`LOAD DATA LOCAL INFILE '${path}' INTO TABLE scores FIELDS TERMINATED BY ',' LINES TERMINATED BY '\\n' IGNORE 1 ROWS`).then(data => {
                res.status(200);
                res.json({ message: "Successfully uploaded.", data: data });
            });
        };
    });
};