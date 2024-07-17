const mm = require("musicmetadata");
const fs = require("fs");
const audioFolder = "public/audio";

// HELPER FUNCTIONS

module.exports = {
  readFileNames,
  getMeta,
};

function readFileNames() {
  let songsInDir = [];
  fs.readdirSync(audioFolder).forEach((file) => {
    songsInDir.push(file);
  });
  return songsInDir;
}

function promisifyMeta(fileName) {
  return new Promise((resolve, reject) => {
    const readableStream = fs.createReadStream(
      __dirname + `/public/audio/${fileName}`
    );
    mm(readableStream, { duration: true }, (err, metadata) => {
      if (err) {
        return reject(err);
      } else {
        readableStream.close();
        return resolve(metadata);
      }
    });
  });
}

async function getMeta(fileName) {
  let metadata = await promisifyMeta(fileName); 
  return {
    title: metadata.title,
    artist: metadata.artist[0],
    duration: metadata.duration,
    path: `/audio/${fileName}`,
  };
}

