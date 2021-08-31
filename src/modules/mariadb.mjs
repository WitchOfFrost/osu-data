import * as mariadb from "mariadb";
import { readFile } from "./file.mjs";

export const config = JSON.parse(readFile.default("./src/config.json"));

const pool = mariadb.createPool({
    host: config.mariadb.host,
    user: config.mariadb.user,
    password: config.mariadb.password,
    database: config.mariadb.name,
    connectionLimit: config.mariadb.maxConnections
});

export class mariadbWorker {
    static runSqlQuery(query, args) {
        let conn;

        return new Promise(async (resolve) => {
            conn = await pool.getConnection().catch(err => console.log(err));
            let response = await conn.query(`${query}`, args);
            resolve(response)
        });
    }

    static runSqlSelect(table, query) {
        let conn;

        return new Promise(async (resolve, reject) => {
            conn = await pool.getConnection().catch(err => console.log(err));
            let data = await conn.query(`CREATE TABLE IF NOT EXISTS ${table} ${query}`)
            console.log(data);
            resolve(data);
        });
    }

    static runSqlReplace(table, query) {
        let conn;

        return new Promise(async (resolve, reject) => {
            conn = await pool.getConnection().catch(err => console.log(err));
            conn.query(`REPLACE INTO ${table} VALUES (${query});`).then({
            }).then(data => {
                if (conn) return conn.end();
                resolve(data);
            }).catch(err => {
                reject(err);
            });

        });
    }

    static runSqlCreateTable(table, query) {
        let conn;

        return new Promise(async (resolve, reject) => {
            conn = await pool.getConnection().catch(err => console.log(err));
            await conn.query(`CREATE TABLE IF NOT EXISTS ${table} (${query})`)
            resolve(true)
        });
    }
}