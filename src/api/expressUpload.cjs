const fileUpload = require('express-fileupload');

exports.expressUploader = async function (api) {
    api.use(fileUpload({ createParentPath: true }));
};