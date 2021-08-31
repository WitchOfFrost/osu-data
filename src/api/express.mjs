import express from 'express';
import morgan from 'morgan';

import { config } from '../index.mjs';
import { mariadbWorker } from "../modules/mariadb.mjs";

const api = express();

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

        await mariadbWorker.runSqlQueryPermanentConnection(`SELECT * FROM ${req.query.type}ranking_${req.query.mode} WHERE rank=? LIMIT 1`, [req.url.split("/").pop()]).then(data => {
            if (data[0] == undefined) {
                res.status(200);
                res.json([{ rank: null, user_id: 0, username: null, score: null }])
            } else {
                res.status(200);
                res.json([data[0]]);
            }
        });
    })

    api.get('/u/*', async (req, res) => {

        req.query.mode = await parseMode(req.query.mode, req.query.m);

        if (["score", "charts", "country", "performance"].includes(req.query.type) == -1 || req.query.type == undefined) {
            req.query.type = "score"
        };

        await mariadbWorker.runSqlQueryPermanentConnection(`SELECT * FROM ${req.query.type}ranking_${req.query.mode} WHERE user_id=? LIMIT 1`, [req.url.split("/").pop()]).then(data => {
            if (data[0] == undefined) {
                res.status(200);
                res.json([{ rank: null, user_id: 0, username: null, score: null }])
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

};