"""
using Spotify API to query playlists using Flask

"""

import requests, urllib.parse
from urllib.error import HTTPError
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time as t
import json, ssl
from datetime import datetime, time 
from flask import Flask, redirect, request, jsonify, session, render_template
from dotenv import load_dotenv
import os

from functools import wraps
def sslwrap(func):
    @wraps(func)
    def bar(*args, **kw):
        kw['ssl_version'] = ssl.PROTOCOL_TLSv1
        return func(*args, **kw)
    return bar

ssl.wrap_socket = sslwrap(ssl.wrap_socket)
app = Flask(__name__)
load_dotenv()
app.secret_key = os.getenv('app_secret_key') #arbitrary string 

CLIENT_ID = os.getenv('client_id')
CLIENT_SECRET = os.getenv('client_secret')
REDIRECT_URI = 'https://localhost:5000/callback'

AUTH_URL = 'https://accounts.spotify.com/authorize'
TOKEN_URL = 'https://accounts.spotify.com/api/token'
API_BASE_URL = 'https://api.spotify.com/v1/'

my_session = requests.Session()
retry = Retry(connect=3, backoff_factor=0.5)
adapter = HTTPAdapter(max_retries=retry)
my_session.mount('http://', adapter)
my_session.mount('https://', adapter)

get_tracks = []

def get_track_info(each_track, headers):
    global get_tracks
    #artist info in an array accounting for multiple artist entries 
    artist_info = []
    for i in range(len(each_track["track"]["artists"])):
        each_artist_info = {
            "track_artist_name": each_track["track"]["artists"][i]["name"],
            "track_artist_id" : each_track["track"]["artists"][i]["id"]
        }
        get_tracks.append({"track-name": each_track["track"]["name"],"track-artist" :  each_track["track"]["artists"][0]["name"]})
        artist_info.append(each_artist_info)
    
    try: 
        response = my_session.get(API_BASE_URL + 'artists/' +  each_track["track"]["artists"][0]["id"]+ '?fields=genres', timeout = (300, 600), headers = headers, verify=ssl.CERT_NONE)
        if response.status_code == 200: 
            track_genre_response = response.json()
            track_genre = track_genre_response["genres"]
        else: 
            track_genre = "No Genre"
    except requests.exceptions.RequestException as e:
        print("Error genre:", e)

    fields = 'danceability,energy'
    track_danceability = 0
    track_energy = 0
    try: 
        response = my_session.get(API_BASE_URL + 'audio-features/' +  each_track["track"]["id"] + '?{'+fields+'}', headers = headers, verify=ssl.CERT_NONE)

        if response.status_code == 200: 
            track_audio_feature = response.json()
            track_danceability = track_audio_feature["danceability"]
            track_energy = track_audio_feature["energy"]
        elif response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 10))  # Default to 1 second if no Retry-After header
            print(f"Rate limited. Retrying after {retry_after} seconds.")
            t.sleep(retry_after)
        else: 
            print("Error features:", response.status_code)
    except requests.exceptions.RequestException as e:
        print("Error features:", e)
    
    try: 
        track_images = each_track["track"]["album"]["images"][0]["url"]
    except:
        track_images = "NO_IMAGES"

    each_track_dict = {
        "track_id": each_track["track"]["id"], 
        "track_name": each_track["track"]["name"],
        "track_album": each_track["track"]["album"]["name"],
        "track_album_id": each_track["track"]["album"]["id"],
        "track_album_release_date": each_track["track"]["album"]["release_date"],
        "track_image": track_images,
        "track_popularity" : each_track["track"]["popularity"],
        "track_artists" : artist_info,
        "track_genre" : track_genre,
        "track_danceability" : track_danceability,
        "track_energy" : track_energy
    }
    return each_track_dict

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    scope = 'user-read-private user-read-email' #input more scopes depending on what data you want 

    params = { #params to pass to the API 
        'client_id': CLIENT_ID,
        'response_type': 'code',
        'scope': scope,
        'redirect_uri': REDIRECT_URI,
        'show_dialog' : True #just for testing purposes -- delete when deploying
    }

    auth_url = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"

    return redirect(auth_url)

@app.route('/callback') #error handling 
def callback():
    if 'error' in request.args:
        return jsonify({"error": request.args['error']})
    
    if 'code' in request.args:
        req_body = {
            'code': request.args['code'],
            'grant_type': 'authorization_code',
            'redirect_uri': REDIRECT_URI,
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
        }
        
        response = requests.post(TOKEN_URL, data=req_body) #getting the access token 
        token_info = response.json()
        
        session['access_token'] = token_info['access_token']
        session['refresh_token'] = token_info['refresh_token']
        session['expires_at'] = datetime.now().timestamp() +token_info['expires_in']

        return redirect('/playlists')
    

@app.route('/playlists')
def get_playlists(): 
    if 'access_token' not in session: 
        return redirect('/login')
    
    if datetime.now().timestamp() > session['expires_at']: 
        return redirect('/refresh-token')

    headers = {
        'Authorization' : f"Bearer {session['access_token']}",
        'verify' : "false"
    }

    fields = 'total, items(tracks,name,owner,id)'
    response = my_session.get(API_BASE_URL + 'me/playlists?fields={'+fields+'}&limit=5', timeout = (300, 600),headers = headers)
    playlists = response.json()

    playlist_list = []
    song_title_list = {}
    counter = 1
    global get_tracks 
    for each_playlist in playlists["items"]: 
        #getting track information for each playlist
        response = my_session.get(str(each_playlist["tracks"]["href"]), headers = headers)
        tracks_info = response.json()
        tracks_array = list(map(lambda each_track: get_track_info(each_track, headers), tracks_info["items"]))
        temp_array = get_tracks
        song_title_list["playlist-" + str(counter)] = temp_array
        get_tracks = []
        counter = counter + 1
        playlist_dict = {
            "playlist_name" : each_playlist["name"],
            "playlist_id" : each_playlist["id"],
            "playlist_owner" : each_playlist["owner"]["id"],
            "tracks" : tracks_array
        } 
        playlist_list.append(playlist_dict)
    
    master_dataset = {
        "playlists" : playlist_list
    }
    # with open('./static/track_list.json', 'w', encoding = 'utf-8') as json_file:
    #     json.dump(song_title_list, json_file, ensure_ascii = False)

    with open("./static/tracks.json", 'w', encoding = 'utf-8') as json_file:
        json.dump(master_dataset, json_file, ensure_ascii = False, indent=4)

    for i in range(5):
        from lyrics import preprocessing_lyrics
        preprocessing_lyrics(song_title_list["playlist-" + str(i+1)], (i+1))

    for i in range(5):
        from testingbert import analyzing_song_lyrics
        analyzing_song_lyrics((i+1))

    return render_template('playlists.html')

@app.route('/refresh-token')
def refresh_token():
    if 'refresh_token' not in session: 
        return redirect('/login')
    
    if datetime.now().timestamp() > session['expires_at']: #if access_token has expired 
        req_body = {
            'grant_type': 'refresh_token',
            'refresh_token' : session['refresh_token'],
            'client_id' : CLIENT_ID,
            'client_secret' : CLIENT_SECRET
        }

    response = session.post(TOKEN_URL, data = req_body)
    new_token_info = response.json()

    session['access_token'] = new_token_info['access_token']
    session['expires_at'] = datetime.now().timestamp() + new_token_info['expires_in']

    return redirect('/playlists')

if __name__ == '__main__': 
    app.run(host = '0.0.0.0', debug=True, ssl_context="adhoc")