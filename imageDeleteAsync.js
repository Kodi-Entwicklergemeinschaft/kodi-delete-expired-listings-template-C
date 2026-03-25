const ObsClient = require("./eSDK_Storage_OBS_V2.1.4_Node.js/lib/obs");

async function deleteImage(path) {
    const server = process.env.BUCKET_HOST;

    const obsClient = new ObsClient({
        accessKeyId: process.env.BUCKET_ACCESS_KEY,
        secretAccessKey: process.env.BUCKET_SECRET_KEY,
        server,
    });

    return new Promise((resolve, reject) => {
        
        const params = {
            Bucket: process.env.BUCKET_NAME,
            Quiet: false,
            Key: path
        }

        obsClient.deleteObject(params, (err, result) => {
            if (!err && result.CommonMsg.Status < 300) {
                resolve(result);
            } else {
                reject(err)
            }
        });
    })
}
async function deleteMultiple(paths) {
    const server = process.env.BUCKET_HOST;

    const obsClient = new ObsClient({
        accessKeyId: process.env.BUCKET_ACCESS_KEY,
        secretAccessKey: process.env.BUCKET_SECRET_KEY,
        server,
    });

    return new Promise((resolve, reject) => {
        
        if (paths.length === 0) {
            resolve();
        }

        const params = {
            Bucket: process.env.BUCKET_NAME,
            Quiet: false,
            Objects: paths.map((path) => ({ Key: path }))
        }

        obsClient.deleteObjects(params, (err, result) => {
            if (!err && result.CommonMsg.Status < 300) {
                resolve(result);
            } else {
                reject(err)
            }
        });
    })
}

module.exports = { deleteImage, deleteMultiple };