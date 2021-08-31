import fs from "fs";

let data;

export class readFile {
    /**
     * 
     * @param {string} path 
     * @returns 
     */
    static default(path) {
        try {
            data = fs.readFileSync(path, 'utf-8');
        } catch (e) {
            console.log(e);
        } finally {
            return (data);
        }
    }
}