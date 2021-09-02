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

    static async parseCSV(path) {
        let csv = this.default(path);

        let matrixCache = await CSVToMatrix(csv, ",");
        return (await MatrixToJSON(matrixCache, 1));

        function CSVToMatrix(csv, delimiter) {
            let matrix = [];
            csv.split('\n').map(l => { l.trim() == "" ? 0 : matrix.push(l.trim().split(delimiter).map(v => v.trim())) })
            return matrix
        }

        function MatrixToJSON(matrix, from, to) {
            let jsonResult = []; from = from || 0;
            matrix.map((a, i) => {
                let obj = Object.assign({}, ...matrix[0].map((h, index) => ({ [h]: matrix[i][index] })))
                jsonResult.push(obj)
            })
            return to ? jsonResult.splice(from, to) : jsonResult.splice(from)
        }
    }
}