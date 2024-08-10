var tracks_data; 
var little_tracks_data;

// const meterLights = document.querySelectorAll('.meter-buttons .ri-alarm-warning-fill');
// const meterButtons = document.querySelectorAll('.meter-buttons .btn');
// const meterNeedle = document.querySelectorAll('.needle');

async function loadLocalizedData() {
    try {
      const response = await fetch('../static/tracks.json');
      tracks_data = await response.json(); 
      little_tracks_data = JSON.parse(JSON.stringify(tracks_data)); 
    } 
    catch (error) {
        console.error('Error loading localized data:', error);
    }
  }

async function load_playlists() {
    // playlists dial animation
    const dial = document.querySelectorAll('.dial.ri-dashboard-3-fill');
    dial.forEach((each_dial, i)=>{
        document.getElementById(`playlist-${i+1}-name`).innerHTML += tracks_data["playlists"][i]["playlist_name"];       
        each_dial.addEventListener("click", () => {
            // if was on lyric svg before new playlist click, reset to main svg
            document.getElementById('main-svg').style.display = 'block';
            document.getElementById('main-lyric-plot').style.display = 'none';

            create_bubbles(tracks_data["playlists"][i]["tracks"]);
            generatePlot(little_tracks_data[i]["tracks"]);
            //reset all the meters & button
            meterNeedle[0].style.transform = `rotate(-70deg)`;
            meterNeedle[1].style.transform = `rotate(-70deg)`;
            [...meterLights].forEach((item)=>{
                item.classList.remove("on");
            })
            document.querySelectorAll('.dial.ri-dashboard-3-fill').forEach((item)=>{
                item.classList.remove("clicked");
            });
            document.querySelectorAll('.playlist-name .ri-alarm-warning-fill').forEach((item)=>{
                item.classList.remove("on");
            });
            each_dial.classList.add("clicked");
            document.querySelectorAll('.playlist-name .ri-alarm-warning-fill')[i].classList.add('on');
            // set popularity meter by default
            meterNeedle[1].style.transform = `rotate(${(-60+ (((1)*40)))}deg)`;
            meterLights[4].classList.add('on');
        });
    });
     // for lyric analysis: 
    // document.getElementById('lyric').addEventListener("click", () => {
    //     document.getElementById('main-svg').style.display = 'none';
    //     document.getElementById('main-lyric-plot').style.display = 'block';
    //     generateLyricsPlot();
    // });

    [...document.querySelectorAll('.btn')].forEach((button, index) => {
        // Check if it's not the second button (index 1, as index starts from 0)
        button.addEventListener("click", () => {
            if (index !== 1) { //make sure that the main svgs return and the lyric-plot div is hidden again
                document.getElementById('main-svg').style.display = 'block';
                document.getElementById('main-lyric-plot').style.display = 'none';
                [...document.querySelectorAll('.dial.ri-dashboard-3-fill')].forEach((element, i) => {
                    if (element.classList.contains('clicked')) {
                        create_bubbles(tracks_data["playlists"][i]["tracks"]);
                    }
                });
            } else { //lyric button so display lyric plot 
                document.getElementById('main-svg').style.display = 'none';
                document.getElementById('main-lyric-plot').style.display = 'block';
                [...document.querySelectorAll('.dial.ri-dashboard-3-fill')].forEach((element, i) => {
                    if (element.classList.contains('clicked')) {
                        // generateLyricsPlot();
                        generateLyricsPlot(i+1,tracks_data["playlists"][i]["playlist_name"], tracks_data["playlists"][i]["tracks"].length); //parameters: i,  name of playlist, num of songs
                    }
                });
            }
        })
    });

    //default display 
    create_bubbles(tracks_data["playlists"][0]["tracks"]); 
    generatePlot(little_tracks_data[0]["tracks"]);
    meterNeedle[1].style.transform = `rotate(${(-60+ (((1)*40)))}deg)`;
    meterLights[4].classList.add('on');
}

async function main() {
    await loadLocalizedData(); // Wait for myAsyncFunction to complete
    const userName = tracks_data["playlists"][0]["playlist_owner"];
    const add_userName = document.getElementById('user-name');
    add_userName.innerHTML = userName;
    little_tracks_data = little_tracks_data["playlists"];
    little_tracks_data.forEach(element => {
        element["tracks"].forEach(track => {
            delete track["track_genre"];
            let og_danceability = track["track_danceability"];
            let og_track_energy = track["track_energy"];
            track["track_danceability"] = (100 * og_danceability);
            track["track_energy"] = (100 * og_track_energy);
        });
    });
    load_playlists();
}
main();