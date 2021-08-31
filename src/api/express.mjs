import express from 'express';
import morgan from 'morgan';

import { config } from '../index.mjs';
import { mariadbWorker } from "../modules/mariadb.mjs";

const api = express();

api.use(morgan('dev'));

export async function apiMain() {
    api.listen(config.api.port, () => {
        console.log("Api running on port " + config.api.port);
    });

    api.get('/rankings', async (req, res) => {

        if (["osu", "mania", "taiko", "fruits"].includes(req.query.mode) == -1 || req.query.mode == undefined) {
            req.query.mode = "osu"
        };

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