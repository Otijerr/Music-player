"use strict";

const utils = require("./utils");
const mysql = require("mysql2");
const express = require("express");
const path = require('path');
const multer = require('multer');
const app = express();
const bodyParser = require('body-parser');
const port = 5500;

var userId = null;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "admin",
  database: "music_player",
});

conn.connect((err) => {
  if (err) {
    console.log(err, `The database connection couldn't be established`);
    return;
  } else {
    console.log(`Connection established`);
  }
});

function registerUser(username, password, callback) {
  const checkUserQuery = 'SELECT * FROM users WHERE login = ?';
  conn.query(checkUserQuery, [username], (err, results) => {
      if (err) {
          console.error('Error checking for existing user:', err);
          callback(false);
          return;
      }
      
      if (results.length > 0) {
          callback(false);
      } else {
          const insertUserQuery = 'INSERT INTO users (login, password) VALUES (?, ?)';
          conn.query(insertUserQuery, [username, password], (err, results) => {
              if (err) {
                  console.error('Error inserting new user:', err);
                  callback(false);
              } else {
                  callback(true, results.insertId);
                  userId = results.insertId;
              }
          });
      }
  });
}

function loginUser(username, password, callback) {
  const checkUserQuery = 'SELECT * FROM users WHERE login = ?';
  conn.query(checkUserQuery, [username], (err, results) => {
      if (err) {
          console.error('Error checking for existing user:', err);
          callback('db_error');
          return;
      }
      
      if (results.length === 0) {
          callback('no_user');
      } else {
          const user = results[0];
          if (user.password === password) {
              callback('success', user.id);
              userId = user.id;
          } else {
              callback('wrong_password');
          }
      }
  });
}

app.post('/reg', function(req, res) {
  var username = req.body.regusername;
  var password = req.body.regpassword;
  registerUser(username, password, (result, infouserId) => {
      if (result) {
          res.redirect('/main');
      } else {
          res.redirect('/?error=Логин уже занят. Попробуйте другой.&form=register');
      }
  });
});

app.post('/log', function(req, res) {
  var username = req.body.logusername;
  var password = req.body.logpassword;
  loginUser(username, password, (result, infouserId) => {
      if (result === 'success') {
          res.redirect('/main');
      } else if (result === 'no_user') {
          res.redirect('/?error=Данного логина не существует.&form=login');
      } else if (result === 'wrong_password') {
          res.redirect('/?error=Неправильный пароль. Попробуйте снова.&form=login');
      } else {
          res.redirect('/?error=Ошибка базы данных. Попробуйте позже.&form=login');
      }
  });
});

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/player.html'));
});

app.get("/main", async (req, res) => {
  const roleuserId = userId; 
  const roleId = await DisplayUploadBtn(roleuserId);
  if(roleId === 1){
    res.sendFile(__dirname + "/public/usermain.html");
  }else if(roleId === 2){
    res.sendFile(__dirname + "/public/adminmain.html");
  }
  importSongsToDb();
});

async function DisplayUploadBtn(roleuserId) {
  const result = await queryDb("SELECT role_id FROM users WHERE id = ?", [roleuserId]);
  const roleId = result[0].role_id;
  return roleId;
}

// GET /playlists

app.get("/playlists", (req, res) => {
  queryDb(`
    INSERT INTO playlists (title, system_rank, user_id)
    SELECT ?, ?, ?
    WHERE NOT EXISTS (
        SELECT 1
        FROM playlists
        WHERE title = ?
        AND user_id = ?
    )
  `, ['Избранное', 1, userId, 'Избранное', userId])
  .catch(err => {console.error('Database error:', err);});

  queryDb("SELECT * FROM playlists WHERE user_id =?", [userId])
    .then((data) => res.status(200).json(data))
    .catch((err) => console.log(err));
});

// POST /playlists // adds new playlist / title is required

app.post("/playlists", (req, res) => {
  let title = req.body.title;

  if (title == "null" || title == null || title == undefined) {
    res.status(400).json({
      message: "Ни один плейлист не был добавлен.",
    });
  }

  createPlaylist(title, userId)
    .then((result) => {
      if (result.message == "Это название уже используется.") {
        res.status(400).json(result);
      } else {
        res.status(200).json(result);
      }
    })
    .catch((err) => console.log(err));
});

// DELETE /playlists/:id

app.delete("/playlists/:id", (req, res) => {
  if (!req.params.id || isNaN(req.params.id)) {
    res.status(400).json({
      error: "Пожалуйста, укажите действительный id плейлиста.",
    });
  } else {
    let id = req.params.id;
    deletePlaylist(id)
      .then((result) => {
        if (result.message) {
          res.status(400).json(result);
        } else {
          res.status(204).json(result);
        }
      })
      .catch((err) => console.log(err));
  }
});

// GET /playlist-tracks/
// return all tracks

app.get("/playlist-tracks", (req, res) => {
  getAllTracks(undefined)
    .then((result) => res.status(200).json(result))
    .catch((err) => console.log(err));
});

// GET /playlist-tracks/:playlist_id

app.get("/playlist-tracks/:playlist_id", (req, res) => {
  let playlist_id = req.params.playlist_id;

  getAllTracks(playlist_id)
    .then((result) => res.status(200).json(result))
    .catch((err) => console.log(err));
});






app.post("/playlist-tracks/:track_id", async (req, res) => {
  try{
    const track_id = req.params.track_id;
    const playlist_id = await findFavorite();

    const result = await addToPlaylist(track_id, playlist_id);
    res.status(200).json(result);
  } catch(err) {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

async function findFavorite()
{
  let favoritePlaylist = await queryDb("SELECT * FROM playlists WHERE user_id = ? AND system_rank = ?",[userId, 1]);
  return favoritePlaylist[0].id;
}
// POST /playlist-tracks/:playlist_id // Adds the track to the playlist identified by playlist_id
app.post("/playlist-tracks/:playlist_id/:track_id", (req, res) => {
  let { playlist_id, track_id } = req.params;
  console.log(track_id, playlist_id);
  addToPlaylist(track_id, playlist_id)
    .then((result) => res.status(200).json(result))
    .catch((err) => console.log(err));
});

// GET /playlist-tracks/:playlist_id/:track_id

app.get("/playlist-tracks/:playlist_id/:track_id", (req, res) => {
  let { playlist_id, track_id } = req.params;

  isTrackOnPlaylist(playlist_id, track_id)
    .then((result) => res.status(200).json(result))
    .catch((err) => console.log(err));
});

// PORT LISTEN

app.listen(port, () => {
  console.log(`The server is up and running on ${port}`);
});

// HELPER FUNCTIONS

function queryDb(sqlQuery, valuesArr) {
  return new Promise((resolve, reject) => {
    conn.query(sqlQuery, valuesArr, (err, result) => {
      if (err) {
        return reject("DATABASE ERROR");
      } else {
        return resolve(result);
      }
    });
  });
}

async function importSongsToDb() {
  let folderSongs = utils.readFileNames();
  let folderSongsPaths = [];
  for (let i = 0; i < folderSongs.length; i++) {
    let song = await utils.getMeta(folderSongs[i]);
    folderSongsPaths.push(song.path);
  }
  for (let i = 0; i < folderSongsPaths.length; i++) {
    let duplicateSong = await queryDb("SELECT * FROM tracks WHERE path = ?", [
      folderSongsPaths[i],
    ]);
    if (duplicateSong.length == 0) {
      await queryDb("INSERT INTO tracks (path) VALUES (?)", [
        folderSongsPaths[i],
      ]);
    }
  }
  return await queryDb("SELECT * FROM tracks");
}



async function getAllTracks(playlist_id) {
  let queryIfPlaylistId =
    "SELECT tracks.id, path, playlist_id FROM tracks LEFT JOIN playlist_content ON tracks.id = playlist_content.track_id WHERE playlist_content.playlist_id = ?";
  let queryIfNoPlaylistId =
    "SELECT DISTINCT tracks.id, path FROM tracks LEFT JOIN playlist_content ON tracks.id = playlist_content.track_id";
  let query = playlist_id ? queryIfPlaylistId : queryIfNoPlaylistId;

  let allTracks = await queryDb(query, playlist_id ? [playlist_id] : []);

  let allTracksInfo = [];

  for (let i = 0; i < allTracks.length; i++) {
    let fileName = allTracks[i].path.split("/")[2];
    try {
      let meta = await utils.getMeta(fileName);
      let track = {
        id: allTracks[i].id,
        title: meta.title,
        artist: meta.artist,
        duration: meta.duration,
        path: allTracks[i].path
      };
      allTracksInfo.push(track);
    } catch (error) {
      console.error(`Failed to get metadata for file ${fileName}:`, error);
    }
  }

  return allTracksInfo;
}

async function deletePlaylist(id) {
  let select = await queryDb(
    "SELECT * FROM playlists WHERE system_rank = ? AND id = ?",
    [1, id]
  );
  if (select.length > 0) {
    return {
      message: "Этот плейлист не может быть удален.",
    };
  }
  let response = await queryDb("DELETE FROM playlists WHERE id = ?", [id]);
  if (response.affectedRows == 0) {
    return {
      message: "Что-то пошло не так. Ни один плейлист не был удален.",
    };
  } else {
    return response;
  }
}

async function createPlaylist(title, userId) {
  let select = await queryDb("SELECT * FROM playlists WHERE title = ?", [
    title,
  ]);
  if (select.length > 0) {
    return {
      message: "Это название уже используется.",
    };
  } else {
    let insert = await queryDb("INSERT INTO playlists (title, user_id) VALUES (?, ?)", [
      title,
      userId
    ]);
    return {
      message: `Плейлист ${title} был добавлен.`,
    };
  }
}

async function addToPlaylist(track_id, playlist_id) {
  let select = await queryDb(
    "SELECT * FROM playlist_content WHERE track_id = ? AND playlist_id = ?",
    [track_id, playlist_id]
  );
  if (select.length > 0) {
    await queryDb(
      "DELETE FROM playlist_content WHERE track_id = ? AND playlist_id = ?",
      [track_id, playlist_id]
    );
    return {
      message: "Трек был удален из плейлиста ",
    };
  } else {
    await queryDb(
      "INSERT INTO playlist_content (track_id, playlist_id) VALUES (?, ?)",
      [track_id, playlist_id]
    );
    return {
      message: "Трек был добавлен в плейлист ",
    };
  }
}

async function isTrackOnPlaylist(playlist_id, track_id) {
  let select = await queryDb(
    "SELECT * FROM playlist_content WHERE playlist_id = ? AND track_id = ?;",
    [playlist_id, track_id]
  );
  if (select.length > 0) {
    return true;
  }
  return false;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'public/audio/');
  },
  filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
  }
  res.status(200).json({ message: 'File uploaded successfully', file: req.file });
});