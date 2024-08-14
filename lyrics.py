import lyricsgenius
import re
import json
import csv
import os
import time
from dotenv import load_dotenv
# import numpy as np
# from nltk.tokenize import word_tokenize
# import importlib
# import importlib_metadata as metadata
# importlib.metadata = metadata
# from bertopic import BERTopic

def preprocessing_lyrics(): #(song_data, playlist_num) 

    with open('./static/track_list.json', 'r') as json_file:
        my_array = json.load(json_file)

    # Initialize Genius API client
    load_dotenv()
    lyric_genius_key = os.getenv('lyrics_genius_API')
    genius = lyricsgenius.Genius(lyric_genius_key, timeout=40)

    # Function to fetch lyrics from Genius API
    def fetch_lyrics(song_title):
        try:
            time.sleep(2)
            song = genius.search_song(song_title)
            if song:
                if len(song.lyrics) < 2000: #if less than 1000 char 
                    return song.lyrics
                else:
                    return None
            else:
                return None
        except Exception as e:
            print(f"Error fetching lyrics for {song_title}: {e}")
            return None

    # Array of song titles
    # song_data = my_array['playlist-'+ str(playlist_num)]

    song_data = my_array['playlist-5']
    
    # Fetch lyrics for each song title
    lyrics_data = []
    for song_entry in song_data:
        lyrics = fetch_lyrics(song_entry['track-name'])
        if lyrics:
            lyrics_info = {
                'song-title': song_entry['track-name'],
                'song-artist' : song_entry['track-artist'],
                'song-lyrics': lyrics
            }
            lyrics_data.append(lyrics_info)

    # relative_path = os.path.join("data", "full_lyrics.txt") # creating full_lyrics.txt was just for testing... get rid during final
    # with open(relative_path, 'w') as file:
    #         for lyrics in lyrics_data:
    #             file.write(lyrics + '\n')

    # #Processing lyrics for model training
    def preprocess_lyrics(lyrics):
        #removing the texts before and after the actual lyrics 
        index_lyrics = lyrics.find("Lyrics")
        cleaned_lyrics = lyrics[(index_lyrics+6):]
        final_lyrics = cleaned_lyrics
        #removing filler words
        words_to_remove = ["[Chorus]", "prechorus", "chorus", "harmony", "interlude", "minichorus", "instrumental", "intro", "verse", "[Verse]", "[Bridge]", "[Outro]", "[Refrain]", "[Hook]", "[Verse 1]","[Verse 2]","[Verse 3]","[Verse 4]","[Verse 5]","[Verse 6]", "You might also like", "Embed", "[Instrumental Bridge]"]
        for word in words_to_remove:
            index_lyrics = final_lyrics.find(word)
            while index_lyrics != -1:
                first_piece = final_lyrics[:index_lyrics]
                last_piece = final_lyrics[(index_lyrics+(len(word)-1)):]
                final_lyrics = first_piece + last_piece
                index_lyrics = final_lyrics.find(word)
        final_final_lyrics = final_lyrics
        lines = final_final_lyrics.split('\n')
        song_lyric = ""
        for i in range (0, len(lines)):
            processed_line = lines[i]
            processed_line = re.sub(r'[^a-zA-Z\s]', '', lines[i]).lower()
            processed_line = re.sub(r'\s+', ' ', processed_line)
            processed_line = re.sub(r'\d+', '', processed_line)
            unicode_pattern = re.compile(r'\\u[0-9a-fA-F]{4}')
            # Replace Unicode characters with an empty string
            processed_line = unicode_pattern.sub('', processed_line)
            if processed_line != '' and processed_line != ' ': 
                # processed_line = processed_line.split(' ')
                song_lyric = song_lyric + processed_line + '\n'
        return song_lyric

    preprocessed_lyrics_data = []
    for lyrics in lyrics_data: 
        processed_lyrics = preprocess_lyrics(lyrics['song-lyrics'])
        lyrics_info = {
            'song-title': lyrics['song-title'], 
            'song-artist': lyrics['song-artist'],
            'song-lyrics': processed_lyrics
        }
        preprocessed_lyrics_data.append(lyrics_info)
    # print(preprocessed_lyrics_data)

    relative_path = os.path.join("static/data", "playlist-5-processed_lyrics.csv")
    #    relative_path = os.path.join("data", "playlist-"+ str(playlist_num)+ "-processed_lyrics.csv")

    with open(relative_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=["song-title", "song-artist", "song-lyrics"])
        writer.writeheader()
        for song in preprocessed_lyrics_data:
            writer.writerow(song)


preprocessing_lyrics()