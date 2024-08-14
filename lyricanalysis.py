import nltk
nltk.download('wordnet')
nltk.download('stopwords')
nltk.download('punkt')
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
from collections import defaultdict
import matplotlib.pyplot as plt
from time import time
from sklearn import metrics
from sklearn.decomposition import PCA
import numpy as np
from scipy.sparse import csr_matrix
import csv
import os
from collections import Counter
from sklearn.decomposition import LatentDirichletAllocation

def analyzing_song_lyrics(playlist_num):
    paragraphs_array = []
    song_title_artist_array = []
    file_path = '/static/data/' + "playlist-"+ str(playlist_num)+ "-processed_lyrics.csv"

    with open(file_path, mode='r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            lines = row['song-lyrics'].split('\n') 
            for line in lines:
                song_title_artist_array.append({'song-title': row['song-title'], 'song-artist': row['song-artist']})
                paragraphs_array.append(line.strip())

    tokenized_sentences = []
    lemmatizer = WordNetLemmatizer()
    stop_words = set(stopwords.words('english'))

    for sentence in paragraphs_array:
        tokens = word_tokenize(sentence.lower())
        tokens = [token for token in tokens if token.isalnum() and token not in stop_words]
        tokens = [lemmatizer.lemmatize(token) for token in tokens]
        tokenized_sentences.append(" ".join(tokens))

    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(tokenized_sentences)

    k = 15  # Number of clusters/topics CHANGE LATERR FROM SCALE INPUT
    kmeans = KMeans(n_clusters=k,max_iter=100,n_init=5)
    kmeans.fit(X)
    clusters = kmeans.labels_

    clusters, paragraphs_array

    topics = defaultdict(list)
    for i, sentence in enumerate(paragraphs_array):
            topics[clusters[i]].append(sentence)

    topic_freq = defaultdict(int)
    for cluster in clusters:
        topic_freq[cluster] += 1

    # cluster_top_words = {}
    # for i in range(k):
    #     cluster_text = [tokenized_sentences[j] for j in range(len(tokenized_sentences)) if clusters[j] == i]
    #     cluster_text = ' '.join(cluster_text)
    #     cluster_words = word_tokenize(cluster_text)
    #     cluster_word_counts = Counter(cluster_words)
    #     top_words = cluster_word_counts.most_common(3)
    #     top_words = [word for word, _ in top_words]
    #     cluster_identifier = '-'.join(top_words)
    #     cluster_top_words[i] = cluster_identifier

    # # Display custom identifiers for each cluster
    # for cluster, identifier in cluster_top_words.items():
    #     print(f"Cluster {cluster}: {identifier}")
        
    lda = LatentDirichletAllocation(n_components=15, random_state=42)
    lda.fit(X)

    # Assign top words from each topic to cluster identifiers
    def get_top_words(topic, n_top_words=3): #cluster top words: 3 (change?)
        return [vectorizer.get_feature_names_out()[i] for i in topic.argsort()[:-n_top_words - 1:-1]]

    cluster_identifiers = {}
    for i, topic in enumerate(lda.components_):
        top_words = get_top_words(topic)
        identifier = '-'.join(top_words)
        cluster_identifiers[i] = identifier

    # Display cluster identifiers
    # for cluster, identifier in cluster_identifiers.items():
    #     print(f"Cluster {cluster}: {identifier}")

    # PCA for dimensionality reduction
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X.toarray())

    #KMeans clustering
    kmeans = KMeans(n_clusters=15)
    kmeans.fit(X_pca)

    # Scatter plot
    # plt.figure(figsize=(8, 6))

    # # Plot each point with its cluster's color
    # plt.scatter(X_pca[:, 0], X_pca[:, 1], c=kmeans.labels_, cmap='viridis', s=5, alpha=0.7)

    # plt.show() 

    centroids = kmeans.cluster_centers_
    cosine_similarities = cosine_similarity(X_pca, centroids)
    cosine_simiarity_scores = cosine_similarities[np.arange(len(clusters)), clusters]

    distances = kmeans.transform(X_pca)
    confidence_levels = np.exp(-distances.min(axis=1))

    data_1 = np.array(X_pca)
    blah = []
    for i in range(len(clusters)):
        blah.append([clusters[i], paragraphs_array[i], cosine_simiarity_scores[i], confidence_levels[i]])
    data_2 = np.array(blah)
    data_full = np.append(data_1, data_2, axis=1)

    # print(data)
    folder_name = "static/data"
    file_name = "playlist-" + str(playlist_num) + "-lyric-plot-data.csv"
    relative_path = os.path.join(folder_name, file_name)
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)

    with open(relative_path, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['x', 'y', 'cluster', 'sentence', 'cosine_simiarity_score', 'confidence_level'])
        writer.writerows(data_full)

    final_data = []
    with open(relative_path, mode='r', encoding='utf-8') as file:
        reader = csv.reader(file)
        next(reader)
        i = 0
        for row in reader:
            each_final_data = {
                'x': row[0],
                'y': row[1],
                'cluster': cluster_identifiers[int(row[2])],
                'sentence': row[3],
                'song-title': song_title_artist_array[i]['song-title'],
                'song-artist': song_title_artist_array[i]['song-artist'],
                'cosine_simiarity_score': row[4],
                'confidence_level' : row[5]
            }
            i = i + 1
            final_data.append(each_final_data)
        
    with open(relative_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=['x', 'y', 'cluster', 'sentence', 'song-title', 'song-artist', 'cosine_simiarity_score', 'confidence_level'])
        writer.writeheader()
        for song in final_data:
            writer.writerow(song)

analyzing_song_lyrics(1)
analyzing_song_lyrics(2)
analyzing_song_lyrics(3)
analyzing_song_lyrics(4)
analyzing_song_lyrics(5)