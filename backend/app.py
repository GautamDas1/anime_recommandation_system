import pandas as pd
import requests
import time
from flask import Flask, request, jsonify
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
from flask_cors import CORS
import math

app = Flask(__name__)
CORS(app)

# --- GLOBAL VARIABLES ---
df = pd.DataFrame()
tfidf_matrix = None
cosine_sim = None
tfidf = TfidfVectorizer(stop_words='english')

# --- 1. SETUP: FETCHES ANIME ON EVERY SERVER START ---

def fetch_top_anime():
    print("Fetching top 20000 anime to build local cache...")
    all_anime = []
    # CORRECTED: Fetches 40 pages to get 1000 anime
    for page in range(1, 100): 
        try:
            response = requests.get(f"https://api.jikan.moe/v4/top/anime?page={page}")
            response.raise_for_status()
            data = response.json().get('data', [])
            if not data: break
            all_anime.extend(data)
            print(f"Fetched page {page}...")
            time.sleep(1)
        except requests.exceptions.RequestException as e:
            print(f"Error fetching top anime: {e}")
            return None
    return all_anime

def get_english_title(titles):
    for title in titles:
        if title['type'] == 'English':
            return title['title']
    return None

def build_model_from_cache(anime_data):
    global df, tfidf_matrix, cosine_sim, tfidf
    
    if not anime_data:
        print("No data to build model.")
        return

    df = pd.DataFrame(anime_data)
    
    df['genre_list'] = df['genres'].apply(lambda genres: [g['name'] for g in genres])
    df['genre_soup'] = df['genre_list'].apply(lambda genres: ' '.join(genres))
    df['synopsis'] = df['synopsis'].fillna('')
    df['feature_soup'] = df['genre_soup'] + ' ' + df['synopsis']
    
    df['name'] = df['title']
    df['english_title'] = df['titles'].apply(get_english_title)
    df['english_title'] = df['english_title'].fillna(df['name'])
    df['image_url'] = df['images'].apply(lambda x: x['jpg']['image_url'])
    df['aired_from'] = df['aired'].apply(lambda x: x.get('from') if isinstance(x, dict) else None)
    df['mal_id'] = df['mal_id']

    tfidf_matrix = tfidf.fit_transform(df['feature_soup'])
    cosine_sim = linear_kernel(tfidf_matrix, tfidf_matrix)
    print("Model built successfully from live data.")

initial_anime_data = fetch_top_anime()
build_model_from_cache(initial_anime_data)


# --- 2. THE HYBRID RECOMMENDATION LOGIC ---

def find_anime_details(title):
    if not title:
        return None
    title_lower = title.lower()
    cached_result = df[(df['name'].str.lower() == title_lower) | (df['english_title'].fillna('').str.lower() == title_lower)]
    
    if not cached_result.empty:
        anime_series = cached_result.iloc[0]
        return {
            'mal_id': int(anime_series['mal_id']),
            'english_title': anime_series['english_title'],
            'image_url': anime_series['image_url'],
            'synopsis': anime_series['synopsis'],
            'score': anime_series['score'],
            'episodes': anime_series['episodes'],
            'status': anime_series['status'],
            'type': anime_series['type'],
            'genres': anime_series['genre_list'],
            'aired_from': anime_series['aired_from']
        }
    
    try:
        response = requests.get(f"https://api.jikan.moe/v4/anime?q={title}&limit=1")
        response.raise_for_status()
        data = response.json().get('data', [])
        if data:
            anime = data[0]
            return {
                'mal_id': anime.get('mal_id'),
                'english_title': get_english_title(anime.get('titles', [])) or anime.get('title'),
                'image_url': anime.get('images', {}).get('jpg', {}).get('image_url'),
                'synopsis': anime.get('synopsis'),
                'score': anime.get('score'),
                'episodes': anime.get('episodes'),
                'status': anime.get('status'),
                'type': anime.get('type'),
                'genres': [g['name'] for g in anime.get('genres', [])],
                'aired_from': anime.get('aired', {}).get('from')
            }
    except requests.exceptions.RequestException as e:
        print(f"API call failed for '{title}': {e}")
    return None

def get_recommendations(title):
    if df.empty: return None, None

    searched_anime_details = find_anime_details(title)
    if not searched_anime_details: return None, None
    
    searched_genres = ' '.join(searched_anime_details.get('genres', []))
    searched_synopsis = searched_anime_details.get('synopsis', '') if searched_anime_details.get('synopsis') else ''
    target_features = searched_genres + ' ' + searched_synopsis

    target_vector = tfidf.transform([target_features])
    sim_scores = linear_kernel(target_vector, tfidf_matrix).flatten()
    sim_scores = list(enumerate(sim_scores))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    
    searched_mal_id = searched_anime_details.get('mal_id')
    filtered_scores = []
    for i, score in sim_scores:
        if df.iloc[i]['mal_id'] != searched_mal_id:
            filtered_scores.append((i, score))

    top_scores = filtered_scores[:10]
    anime_indices = [i[0] for i in top_scores]
    
    results_df = df.iloc[anime_indices][['mal_id', 'english_title', 'image_url', 'synopsis', 'score', 'episodes', 'status', 'type', 'genre_list', 'aired_from']]
    results_df = results_df.rename(columns={'genre_list': 'genres'})
    recommendations = results_df.to_dict('records')
    
    return searched_anime_details, recommendations


# --- 3. API ENDPOINTS ---
@app.route("/trending")
def get_trending_anime():
    if df.empty: return jsonify([])
    trending_df = df.head(25)
    results_df = trending_df[['mal_id', 'english_title', 'image_url', 'synopsis', 'score', 'episodes', 'status', 'type', 'genre_list', 'aired_from']]
    results_df = results_df.rename(columns={'genre_list': 'genres'})
    results = results_df.to_dict('records')
    return jsonify(results)

@app.route("/recommend")
def recommend():
    title = request.args.get('title')
    if not title: return jsonify({"error": "Please provide an anime title."}), 400
    searched_anime, recommendations = get_recommendations(title)
    if searched_anime is None: return jsonify({"error": f"Anime title '{title}' not found."}), 404
    return jsonify({"searched_anime": searched_anime, "recommendations": recommendations})

@app.route("/genres")
def get_all_genres():
    if df.empty: return jsonify([])
    all_genres = [genre for sublist in df['genre_list'] for genre in sublist]
    unique_genres = list(set(all_genres))
    # Manually add special genres if they aren't in the cache
    for special_genre in ['Hentai', 'Adventure']:
        if special_genre not in unique_genres:
            unique_genres.append(special_genre)
    return jsonify(sorted(unique_genres))

# Genres that will always be fetched live from the API
LIVE_FETCH_GENRES = {
    'Hentai': {'genres': 12, 'rating': 'rx'},
    'Adventure': {'genres': 2}
}

@app.route("/by_genre")
def by_genre():
    genre = request.args.get('genre')
    page = request.args.get('page', 1, type=int)
    per_page = 20

    if not genre: return jsonify({"error": "Please provide a genre."}), 400

    # --- Special handling for live-fetch genres ---
    if genre in LIVE_FETCH_GENRES:
        print(f"Fetching live data for {genre} genre...")
        try:
            params = { 'page': page, 'limit': per_page, **LIVE_FETCH_GENRES[genre] }
            response = requests.get("https://api.jikan.moe/v4/anime", params=params)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for anime in data.get('data', []):
                results.append({
                    'mal_id': anime.get('mal_id'),
                    'english_title': get_english_title(anime.get('titles', [])) or anime.get('title'),
                    'image_url': anime.get('images', {}).get('jpg', {}).get('image_url'),
                    'synopsis': anime.get('synopsis'),
                    'score': anime.get('score'),
                    'episodes': anime.get('episodes'),
                    'status': anime.get('status'),
                    'type': anime.get('type'),
                    'genres': [g['name'] for g in anime.get('genres', [])],
                    'aired_from': anime.get('aired', {}).get('from')
                })
            
            pagination_data = data.get('pagination', {})
            total_pages = pagination_data.get('last_visible_page', 1)
            searched_anime_for_genre = { 'english_title': f'Top {genre} Anime', 'image_url': 'https://placehold.co/400x600/1a202c/718096?text=Genre', 'synopsis': f'A curated list of anime in the {genre} genre.', 'score': None }
            
            return jsonify({ "searched_anime": searched_anime_for_genre, "recommendations": results, "current_page": page, "total_pages": total_pages })
        except requests.exceptions.RequestException as e:
            print(f"API call failed for genre '{genre}': {e}")
            return jsonify({"error": f"Could not fetch data for genre '{genre}'."}), 500
    
    # --- For all other genres, use the local cache ---
    else:
        genre_df = df[df['genre_list'].apply(lambda x: genre in x)].copy()
        if genre_df.empty: return jsonify({"error": f"No anime found for genre '{genre}' in our cache."}), 404
        
        # Handle missing values before sorting
        genre_df['score'] = pd.to_numeric(genre_df['score'], errors='coerce').fillna(0)
        genre_df['members'] = pd.to_numeric(genre_df['members'], errors='coerce').fillna(0)
        genre_df = genre_df.sort_values(by=['score', 'members'], ascending=[False, False])
        
        total_items = len(genre_df)
        total_pages = math.ceil(total_items / per_page)
        
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        paginated_df = genre_df.iloc[start_index:end_index]
        
        results_df = paginated_df[['mal_id', 'english_title', 'image_url', 'synopsis', 'score', 'episodes', 'status', 'type', 'genre_list', 'aired_from']]
        results_df = results_df.rename(columns={'genre_list': 'genres'})
        results = results_df.to_dict('records')

        searched_anime_for_genre = { 'english_title': f'Top {genre} Anime', 'image_url': 'https://placehold.co/400x600/1a202c/718096?text=Genre', 'synopsis': f'A curated list of the top-rated anime in the {genre} genre, sorted by score and popularity.', 'score': None }
        
        return jsonify({ "searched_anime": searched_anime_for_genre, "recommendations": results, "current_page": page, "total_pages": total_pages })

if __name__ == '__main__':
    app.run(debug=True)