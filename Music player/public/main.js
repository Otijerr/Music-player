"use strict";

const notifications = document.querySelector(".notifications");
const logo = document.querySelector(".logo");

const title = document.querySelector(".playing-title");
const artist = document.querySelector(".playing-artist");

const tracksTable = document.querySelector(".tracks-table");
const addSongToPlaylist = document.querySelector(".add-to-playlist");
const addSongToFavorites = document.querySelector(".add-to-favorites");

const addPlaylist = document.querySelector(".playlists-heading img");
const playlistsTable = document.querySelector(".playlists-table tbody");
const allTracksPlaylist = document.querySelector("#all-tracks");

const controlPanel = document.querySelector(".control-panel");

const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

const searchInput = document.getElementById("search-input");

const progressBar = document.querySelector("#slider-progress");
const volumeBar = document.querySelector("#slider-volume");

const volumeBtn = document.querySelector(".volume-icon");
const shuffleBtn = document.querySelector("#shuffle");
const repeatBtn = document.getElementById("repeat");

const currentTimePoint = document.querySelector(".current-time");
const endTime = document.querySelector(".end-time");

const audio = document.getElementById("audio");

localStorage.setItem("index", 0);

// PLAY BUTTON

playBtn.addEventListener("click", () => {
  let isPlaying = controlPanel.classList.contains("is-playing");

  if (!isPlaying) {
    playTrack();
  } else {
    pauseTrack();
  }
});

// PROGRESS BAR

audio.addEventListener("timeupdate", updateProgress);

progressBar.addEventListener("click", setProgress);

// LOGO ANIMATION

audio.onplay = () => {
  if (logo.classList.contains("paused")) {
    logo.classList.remove("paused");
  }
};

audio.onpause = () => {
  if (!logo.classList.contains("paused")) {
    logo.classList.add("paused");
  }
};

// LOGO => ALL TRACKS

logo.addEventListener("click", () => {
  renderPlaylistsTracks("/playlist-tracks");
  setNotSelectedRow("playlists-table-tbody");
  setSelectedRow(allTracksPlaylist);
});

// VOLUME

volumeBar.addEventListener("change", setVolume);

volumeBtn.addEventListener("click", () => {
  if (volumeBtn.classList.contains("muted")) {
    unmuteAudio();
  } else {
    muteAudio();
  }
});

// NEXT & PREVIOUS BUTTON, SONG ENDED

nextBtn.addEventListener("click", () => {
  playNextSong(true);
});

prevBtn.addEventListener("click", () => {
  playPreviousSong();
});

audio.addEventListener("ended", () => {
  playNextSong(false);
});

// SHUFFLE

shuffleBtn.addEventListener("click", () => {
  console.log("shuffle");
  if (shuffleBtn.classList.contains("shuffle-off")) {
    shuffleBtn.classList.remove("shuffle-off");
    shuffleBtn.classList.add("shuffle-on");
  } else {
    shuffleBtn.classList.remove("shuffle-on");
    shuffleBtn.classList.add("shuffle-off");
  }
});

// REPEAT

repeatBtn.addEventListener("click", () => {
  if (repeatBtn.classList.contains("repeat-off")) {
    repeatBtn.classList.remove("repeat-off");
    repeatBtn.classList.add("repeat-on");
  } else {
    repeatBtn.classList.remove("repeat-on");
    repeatBtn.classList.add("repeat-off");
  }
});


// ADD PLAYLIST

addPlaylist.addEventListener("click", addNewPlaylist);

// RENDER PLAYLISTS TABLE

fetch("/playlists")
  .then((res) => res.json())
  .then((result) => {
    renderPlaylistsTable(result);
  })
  .catch((err) => console.log(err));

// RENDER ALL TRACKS

allTracksPlaylist.addEventListener("click", () => {
  renderPlaylistsTracks("/playlist-tracks");
});

// ADD SONG TO FAVORITES

addSongToFavorites.addEventListener("click", () => {
  fetchContent(`/playlist-tracks/${localStorage.getItem("track_id")}`, "POST")
    .then((res) => res.json())
    .then((result) => {
      notifications.innerHTML = result.message + "Избранное";
      setTimeout(clearNotifications, 5000);
    });
});

// ADD SONG TO PLAYLIST

addSongToPlaylist.addEventListener("click", () => {
  let currentSong = parseInt(localStorage.getItem("track_id"));
  let selectedPlaylist = 0;
  let selectedPlaylistTitle = "";
  let playlists = document.querySelectorAll("[playlist_id]");

  for (let i = 0; i < playlists.length; i++) {
    if (playlists[i].classList.contains("selected")) {
      selectedPlaylist = parseInt(playlists[i].getAttribute("playlist_id"));
      selectedPlaylistTitle = playlists[i].textContent;
    }
  }

  fetchContent(`/playlist-tracks/${selectedPlaylist}/${currentSong}`, "POST")
    .then((res) => res.json())
    .then((result) => {
      notifications.innerHTML = result.message + selectedPlaylistTitle;
      setTimeout(clearNotifications, 5000);
    });
});

// HELPER FUNCTIONS

function loadTrack(track_id) {
  localStorage.setItem("track_id", track_id);
  const tracksTableRows = document.querySelectorAll(".tracks-table tr");
  for (let i = 0; i < tracksTableRows.length; i++) {
    if (tracksTableRows[i].getAttribute("track_id") == track_id) {
      title.textContent = tracksTableRows[i].getAttribute("track_title");
      artist.textContent = tracksTableRows[i].getAttribute("track_artist");
      endTime.innerHTML = tracksTableRows[i].getAttribute("track_duration");
      audio.src = tracksTableRows[i].getAttribute("track_path");
    }
  }
  progressBar.value = 0;

  setAsFavorite(track_id)
    .then((result) => {
      playTrack();
    })
    .catch((err) => console.log(err));
}

async function setAsFavorite(track_id) {
  let response = await fetch(`/playlist-tracks/1/${track_id}`);
  let isFavorite = await response.json();
  if (isFavorite) {
    addSongToFavorites.style.filter = "brightness(0)";
  } else {
    addSongToFavorites.style.filter = "brightness(1)";
  }
  return isFavorite;
}

function playTrack() {
  playBtn.classList.add("pause");
  playBtn.classList.remove("play");
  controlPanel.classList.add("is-playing");
  audio.play();
}

function pauseTrack() {
  playBtn.classList.add("play");
  playBtn.classList.remove("pause");
  controlPanel.classList.remove("is-playing");
  audio.pause();
}

function clearNotifications() {
  notifications.innerHTML = "";
}

function getTime(seconds) {
  let s = parseInt(seconds % 60);
  let m = parseInt((seconds / 60) % 60);
  let mm = m < 10 ? "0" + m : m;
  let ss = s < 10 ? "0" + s : s;
  return mm + ":" + ss;
}

function setSelectedRow(row) {
  if (row.classList.contains("not-selected")) {
    row.classList.remove("not-selected");
    row.classList.add("selected");
  }
}

function setNotSelectedRow(tableClass) {
  let rows = document.querySelectorAll(`.${tableClass} tr`);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].classList.contains("selected")) {
      rows[i].classList.remove("selected");
      rows[i].classList.add("not-selected");
    }
  }
}

function selectPlaylistRow(className) {
  let rows = document.querySelectorAll(`.${className} tr`);
  for (let j = 0; j < rows.length; j++) {
    rows[j].addEventListener("click", () => {
      setNotSelectedRow(`${className}`);
      rows[j].classList.remove("not-selected");
      rows[j].classList.add("selected");
    });
  }
}

function renderPlaylistsTracks(api) {
  tracksTable.innerHTML = "";
  localStorage.setItem("index", 0);

  fetch(api)
    .then((res) => res.json())
    .then((result) => {
      renderTracksTable(result);
    })
    .catch((err) => console.log(err));
}

function playNextSong(isManual = false) {
  let trackRows = document.querySelectorAll(".tracks-table tr");

  if (repeatBtn.classList.contains("repeat-on") && !isManual) {
    let songIndex = parseInt(localStorage.getItem("index"));
    let TrackId = trackRows[songIndex].getAttribute("track_id");
    loadTrack(TrackId);
  }
  else if (shuffleBtn.classList.contains("shuffle-off")) {
    let songIndex = parseInt(localStorage.getItem("index"));

    if (songIndex == trackRows.length - 1) {
      songIndex = 0;
    } else {
      songIndex++;
    }

    let nextTrackId = trackRows[songIndex].getAttribute("track_id");
    loadTrack(nextTrackId);
    localStorage.setItem("index", songIndex);

    if (songIndex == 0) {
      setNotSelectedRow("tracks-table");
      trackRows[songIndex].setAttribute("class", "selected");
    } else {
      trackRows[songIndex - 1].setAttribute("class", "not-selected");
      trackRows[songIndex].setAttribute("class", "selected");
    }
  } 
  else {
    let songIndex = Math.round(Math.random() * (trackRows.length - 1));
    let nextTrackId = trackRows[songIndex].getAttribute("track_id");

    setNotSelectedRow("tracks-table");
    trackRows[songIndex].setAttribute("class", "selected");
    loadTrack(nextTrackId);

    localStorage.setItem("index", songIndex);
  }
}

function playPreviousSong() {
  let trackRows = document.querySelectorAll(".tracks-table tr");
  let songIndex = parseInt(localStorage.getItem("index"));

  if (songIndex == 0) {
    songIndex = trackRows.length - 1;
  } else {
    songIndex--;
  }

  let prevTrackId = trackRows[songIndex].getAttribute("track_id");
  loadTrack(prevTrackId);

  localStorage.setItem("index", songIndex);

  if (songIndex == trackRows.length - 1) {
    setNotSelectedRow("tracks-table");
    trackRows[songIndex].setAttribute("class", "selected");
  } else {
    trackRows[songIndex + 1].setAttribute("class", "not-selected");
    trackRows[songIndex].setAttribute("class", "selected");
  }
}

function updateProgress(event) {
  let { duration, currentTime } = event.srcElement;

  if (isNaN(duration)) {
    duration = 0;
  }

  let progressPercent = (currentTime / duration) * 100;

  progressBar.value = progressPercent;
  currentTimePoint.textContent = getTime(currentTime);
  endTime.textContent = getTime(duration);
}

function setProgress(event) {
  let width = 260;
  let click = event.offsetX;
  let duration = audio.duration;
  audio.currentTime = (click / width) * duration;
}

function addNewPlaylist() {
  let newPlaylist = prompt("Пожалуйтса, назовите Ваш новый плейлист:");

  if (!newPlaylist) {
    notifications.innerHTML = "Ни один плейлист не был добавлен.";
    setTimeout(clearNotifications, 5000);
    return;
  } else {
    let playlistTitle = {
      title: newPlaylist,
    };
    fetchContent("/playlists", "POST", playlistTitle)
      .then((res) => res.json())
      .then((result) => {
        notifications.innerHTML = result.message;
        setTimeout(clearNotifications, 5000);
      })
      .catch((err) => console.log(err));
  }
}

async function fetchContent(api, method, bodyValues) {
  return await fetch(api, {
    method: method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyValues),
  });
}

// VOLUME

function setVolume(event) {
  if (volumeBtn.classList.contains("muted")) {
    volumeBtn.classList.remove("muted");
    volumeBtn.classList.add("not-muted");
  }
  audio.volume = event.currentTarget.value / 100;
}

function muteAudio() {
  volumeBtn.classList.add("muted");
  volumeBtn.classList.remove("not-muted");
  audio.volume = 0;
  volumeBar.value = 1;
}

function unmuteAudio() {
  volumeBtn.classList.remove("muted");
  volumeBtn.classList.add("not-muted");
  audio.volume = 0.1;
  volumeBar.value = 1;
}

// RENDER PLAYLISTS TABLE

function renderPlaylistsTable(result) {
  for (let i = 0; i < result.length; i++) {
    let row = document.createElement("tr");

    row.classList.add("not-selected");

    let playlistTitle = document.createElement("td");
    row.setAttribute("playlist_id", result[i].id);
    let deleteColumn = document.createElement("td");

    if (result[i].system_rank == 0) {
      let deleteImg = document.createElement("img");
      deleteImg.src = "img/close.png";
      deleteColumn.appendChild(deleteImg);
      deleteImg.addEventListener("click", () => {
        fetchContent(`/playlists/${result[i].id}`, "DELETE")
          .then((res) => {
            if (res.status == 204) {
              return {
                message: `Плейлист был удален.`,
              };
            } else {
              res.json();
            }
          })
          .then((result) => {
            notifications.innerHTML = result.message;
            setTimeout(clearNotifications, 5000);
          })
          .catch((err) => console.log(err));
      });
    }

    row.appendChild(playlistTitle);
    row.appendChild(deleteColumn);

    playlistsTable.appendChild(row);

    playlistTitle.textContent = result[i].title;

    // SELECTING A PLAYLIST

    selectPlaylistRow(`playlists-table-tbody`);

    // RENDER TRACK LIST OF THE SELECTED PLAYLIST

    row.addEventListener("click", () => {
      renderPlaylistsTracks(`/playlist-tracks/${result[i].id}`);
    });
  }
}

// RENDER TRACKS

function renderTracksTable(result) {
  for (let i = 0; i < result.length; i++) {
    let row = document.createElement("tr");

    row.classList.add("not-selected");

    let trackId = document.createElement("td");
    let trackTitle = document.createElement("td");
    let trackDuration = document.createElement("td");

    row.appendChild(trackId);
    row.appendChild(trackTitle);
    row.appendChild(trackDuration);

    tracksTable.appendChild(row);

    // trackId.textContent = result[i].id;
    // trackId.style.color = "gray";
    trackTitle.textContent = result[i].title;
    trackDuration.textContent = getTime(result[i].duration);

    const tracksTableRows = document.querySelectorAll(".tracks-table tr");

    tracksTableRows[i].setAttribute("track_id", result[i].id);
    tracksTableRows[i].setAttribute("track_title", result[i].title);
    tracksTableRows[i].setAttribute("track_artist", result[i].artist);
    tracksTableRows[i].setAttribute("track_duration", result[i].duration);
    tracksTableRows[i].setAttribute("track_path", result[i].path);

    // SELECT SONG FROM THE LIST

    row.addEventListener("click", () => {
      loadTrack(result[i].id);
      localStorage.setItem("index", i);
      setNotSelectedRow("tracks-table");
      setSelectedRow(row);
    });
  }
}

// SEARCH TRACK 
searchInput.addEventListener("input", () => {
  tracksTable.innerHTML = "";
  localStorage.setItem("index", 0);
  const query = document.getElementById('search-input').value.trim().toLowerCase();
  let sortedSong = [];
  fetch("/playlist-tracks")
    .then((res) => res.json())
    .then((result) => {
      sortedSong = filterTracks(result, query);
        renderTracksTable(sortedSong);
    })
    .catch((err) => console.log(err));
});

function filterTracks(tracks, query) {
  if (!Array.isArray(tracks) || !query) {
    return tracks;
  }
  return tracks.filter(track => {
    const artist = track.artist ? track.artist.toString().toLowerCase() : '';
    const title = track.title ? track.title.toString().toLowerCase() : '';

    return artist.includes(query) || title.includes(query);
  });
}


//UPLOAD NEW TRACK FROM PROJECT FOLDER
document.getElementById('uploadBtn').addEventListener('click', function() {
  document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
      // Проверка типа файла
      if (file.type !== 'audio/mpeg') {
          alert('Please select an MP3 file.');
          return;
      }

      // Перемещение файла в определённую папку (здесь подразумевается использование сервера)
      const formData = new FormData();
      formData.append('file', file);

      fetch('/upload', {
          method: 'POST',
          body: formData
      })
      .then(response => response.json())
      .then(data => {
          console.log('File uploaded successfully', data);
      })
      .catch(error => {
          console.error('Error uploading file:', error);
      });
  }
});
