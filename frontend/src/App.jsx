import React, { useState, useCallback, useMemo, useEffect } from 'react';

// --- CONFIGURATION ---
// Change this to your Render URL after your backend is deployed!
// Example: const BACKEND_URL = 'https://your-app-name.onrender.com';
const BACKEND_URL = 'http://127.0.0.1:5000';

// Theme configuration object
const themes = {
  dark: {
    mainBg: 'bg-gray-900', mainText: 'text-white', headerText: 'text-sky-400', subHeaderText: 'text-gray-400',
    inputBg: 'bg-gray-800', inputBorder: 'border-gray-700', inputText: 'text-white', placeholderText: 'placeholder-gray-500',
    focusRing: 'focus:ring-sky-500', buttonBg: 'bg-sky-500', buttonHoverBg: 'hover:bg-sky-600',
    backButtonBg: 'bg-gray-700', backButtonHoverBg: 'hover:bg-gray-600', statusText: 'text-gray-400',
    cardBg: 'bg-gray-800', cardTitle: 'text-sky-400', cardScore: 'text-yellow-400', cardSynopsis: 'text-gray-300',
    skeletonBg: 'bg-gray-700', tagBg: 'bg-gray-700', tagText: 'text-sky-300', tagHoverBg: 'hover:bg-gray-600',
    selectBg: 'bg-gray-800', selectBorder: 'border-gray-700',
    scrollbarThumb: 'scrollbar-thumb-gray-600', scrollbarTrack: 'scrollbar-track-gray-800',
  },
  light: {
    mainBg: 'bg-gray-100', mainText: 'text-gray-800', headerText: 'text-blue-600', subHeaderText: 'text-gray-500',
    inputBg: 'bg-white', inputBorder: 'border-gray-300', inputText: 'text-gray-900', placeholderText: 'placeholder-gray-400',
    focusRing: 'focus:ring-blue-500', buttonBg: 'bg-blue-500', buttonHoverBg: 'hover:bg-blue-600',
    backButtonBg: 'bg-gray-600', backButtonHoverBg: 'hover:bg-gray-700', statusText: 'text-gray-500',
    cardBg: 'bg-white shadow-md border border-gray-200', cardTitle: 'text-blue-600', cardScore: 'text-amber-500',
    cardSynopsis: 'text-gray-600', skeletonBg: 'bg-gray-300', tagBg: 'bg-gray-200',
    tagText: 'text-blue-700', tagHoverBg: 'hover:bg-gray-300', selectBg: 'bg-white', selectBorder: 'border-gray-300',
    scrollbarThumb: 'scrollbar-thumb-gray-400', scrollbarTrack: 'scrollbar-track-gray-200',
  },
  blue: {
    mainBg: 'bg-slate-900', mainText: 'text-white', headerText: 'text-cyan-400', subHeaderText: 'text-slate-400',
    inputBg: 'bg-slate-800', inputBorder: 'border-slate-700', inputText: 'text-white', placeholderText: 'placeholder-slate-500',
    focusRing: 'focus:ring-cyan-500', buttonBg: 'bg-cyan-500', buttonHoverBg: 'hover:bg-cyan-600',
    backButtonBg: 'bg-slate-700', backButtonHoverBg: 'hover:bg-slate-600', statusText: 'text-slate-400',
    cardBg: 'bg-slate-800', cardTitle: 'text-cyan-400', cardScore: 'text-yellow-400',
    cardSynopsis: 'text-slate-300', skeletonBg: 'bg-slate-700', tagBg: 'bg-slate-700',
    tagText: 'text-cyan-300', tagHoverBg: 'hover:bg-slate-600', selectBg: 'bg-slate-800', selectBorder: 'border-slate-700',
    scrollbarThumb: 'scrollbar-thumb-slate-600', scrollbarTrack: 'scrollbar-track-slate-800',
  }
};

// Main App Component
export default function App() {
  const [theme, setTheme] = useState('dark');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedAnime, setSearchedAnime] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('Enter an anime title, select a genre, or browse trending shows!');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [sortOption, setSortOption] = useState('default');
  const [genres, setGenres] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [showTrending, setShowTrending] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentGenre, setCurrentGenre] = useState(null);

  const currentTheme = themes[theme];
  
  const handleError = useCallback((error) => {
      console.error('Fetch error:', error);
      setStatus(`Error: ${error.message}. Please make sure the backend server is running at ${BACKEND_URL}`);
      setSearchedAnime(null);
      setRecommendations([]);
      setIsLoading(false);
      setIsTrendingLoading(false);
  }, []);

  useEffect(() => {
    const savedFavorites = localStorage.getItem('animeFavorites');
    if (savedFavorites) { setFavorites(JSON.parse(savedFavorites)); }
  }, []);
  
  useEffect(() => {
    localStorage.setItem('animeFavorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const fetchInitialData = async () => {
        setIsTrendingLoading(true);
        try {
            // Fetch Genres
            const genresResponse = await fetch(`${BACKEND_URL}/genres`);
            if (!genresResponse.ok) throw new Error(`Could not fetch genres (Status: ${genresResponse.status})`);
            const genresData = await genresResponse.json();
            setGenres(genresData);
            
            // Fetch Trending
            const trendingResponse = await fetch(`${BACKEND_URL}/trending`);
            if (!trendingResponse.ok) throw new Error(`Could not fetch trending anime (Status: ${trendingResponse.status})`);
            const trendingData = await trendingResponse.json();
            setTrendingAnime(trendingData);
        } catch (error) { 
            handleError(error);
        } finally { 
            setIsTrendingLoading(false); 
        }
    };
    fetchInitialData();
  }, [handleError]);

  const processApiResponse = (data) => {
    setSearchedAnime(data.searched_anime);
    setRecommendations(data.recommendations);
    setStatus(`Showing results for "${data.searched_anime.english_title}":`);
    setCurrentPage(data.current_page || 1);
    setTotalPages(data.total_pages || 1);
  };

  const fetchRecommendations = useCallback(async (title) => {
    if (!title) { setStatus('Please enter an anime title.'); return; }
    setIsLoading(true); setRecommendations([]); setSearchedAnime(null); setCurrentGenre(null); setShowTrending(false);
    setStatus(`Searching...`);
    try {
      const response = await fetch(`${BACKEND_URL}/recommend?title=${encodeURIComponent(title)}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'An error occurred');
      }
      processApiResponse(await response.json());
    } catch (error) { handleError(error); } 
    finally { setIsLoading(false); }
  }, [handleError]);
  
  const fetchByGenre = useCallback(async (genre, page = 1) => {
    if (!genre) return;
    setIsLoading(true); setRecommendations([]); setSearchedAnime(null); setShowTrending(false);
    setStatus(`Searching for ${genre} anime...`);
    try {
      const response = await fetch(`${BACKEND_URL}/by_genre?genre=${encodeURIComponent(genre)}&page=${page}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'An error occurred');
      }
      processApiResponse(await response.json());
    } catch (error) { handleError(error); } 
    finally { setIsLoading(false); }
  }, [handleError]);

  const executeSearch = (title) => {
    if (recommendations.length > 0 || searchedAnime) { 
      setHistory(prev => [...prev, { recommendations, searchedAnime, currentGenre, currentPage, totalPages }]); 
    }
    setSearchTerm(title); 
    fetchRecommendations(title);
  };

  const executeGenreSearch = (genre, page = 1) => {
    if (recommendations.length > 0 || searchedAnime) { 
       setHistory(prev => [...prev, { recommendations, searchedAnime, currentGenre, currentPage, totalPages }]); 
    }
    setSearchTerm(''); 
    setCurrentGenre(genre);
    fetchByGenre(genre, page);
  };
  
  const toggleFavorite = (anime) => {
    setFavorites(prev => {
        const isFavorited = prev.some(fav => fav.mal_id === anime.mal_id);
        if (isFavorited) {
            return prev.filter(fav => fav.mal_id !== anime.mal_id);
        } else {
            return [...prev, anime];
        }
    });
  };

  const handleSearch = () => executeSearch(searchTerm);
  const handleCardClick = (anime) => setSelectedAnime(anime);
  const handleCloseModal = () => setSelectedAnime(null);
  
  const handleBack = () => {
    if (history.length === 0) return;
    const newHistory = [...history];
    const lastState = newHistory.pop();
    
    setRecommendations(lastState.recommendations); 
    setSearchedAnime(lastState.searchedAnime);
    setCurrentGenre(lastState.currentGenre); 
    setCurrentPage(lastState.currentPage); 
    setTotalPages(lastState.totalPages);
    setHistory(newHistory);

    if (newHistory.length === 0) {
        setShowTrending(true);
        setStatus('Enter an anime title, select a genre, or browse trending shows!');
        setRecommendations([]);
        setSearchedAnime(null);
    } else {
        setStatus(lastState.searchedAnime ? `Showing previous results for "${lastState.searchedAnime.english_title}":` : 'Welcome back!');
    }
  };

  const handleKeyPress = (e) => (e.key === 'Enter') && handleSearch();
  
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages && currentGenre) {
        executeGenreSearch(currentGenre, newPage);
    }
  };

  const sortedRecommendations = useMemo(() => {
    const sortable = [...recommendations];
    if (sortOption === 'score') sortable.sort((a, b) => (b.score || 0) - (a.score || 0));
    else if (sortOption === 'az') sortable.sort((a, b) => a.english_title.localeCompare(b.english_title));
    else if (sortOption === 'date') {
        sortable.sort((a, b) => {
            const dateA = a.aired_from ? new Date(a.aired_from) : new Date(0);
            const dateB = b.aired_from ? new Date(b.aired_from) : new Date(0);
            return dateB - dateA;
        });
    }
    return sortable;
  }, [recommendations, sortOption]);

  return (
    <div className={`${currentTheme.mainBg} ${currentTheme.mainText} min-h-screen font-sans transition-colors duration-500`}>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
      `}</style>
      <div className="max-w-7xl mx-auto text-center relative">
        <div className={`sticky top-0 ${currentTheme.mainBg} z-30 pt-8 pb-4 shadow-lg`}>
          <div className="absolute top-0 right-0 flex items-center gap-4 p-4 z-40">
              <button onClick={() => setIsFavoritesModalOpen(true)} className={`${currentTheme.backButtonBg} ${currentTheme.backButtonHoverBg} text-white font-bold py-2 px-4 rounded-full text-sm`}>❤️ My Favorites</button>
              <div className="flex gap-2">
                  <button title="Light Theme" onClick={() => setTheme('light')} className={`w-6 h-6 rounded-full bg-gray-100 border-2 ${theme === 'light' ? 'border-blue-500' : 'border-gray-300'}`}></button>
                  <button title="Dark Theme" onClick={() => setTheme('dark')} className={`w-6 h-6 rounded-full bg-gray-800 border-2 ${theme === 'dark' ? 'border-sky-500' : 'border-gray-600'}`}></button>
                  <button title="Blue Theme" onClick={() => setTheme('blue')} className={`w-6 h-6 rounded-full bg-slate-800 border-2 ${theme === 'blue' ? 'border-cyan-500' : 'border-slate-600'}`}></button>
              </div>
          </div>
          <header className="mb-8 pt-8">
            <h1 className={`text-4xl sm:text-5xl font-bold ${currentTheme.headerText} mb-2`}>Anime Recommendation Engine</h1>
            <p className={`text-lg ${currentTheme.subHeaderText}`}>Discover your next favorite show.</p>
          </header>
          <div className="flex flex-wrap justify-center items-center gap-2 mb-4 max-w-4xl mx-auto px-4">
            {history.length > 0 && !isLoading && ( <button onClick={handleBack} className={`px-6 py-3 ${currentTheme.backButtonBg} ${currentTheme.backButtonHoverBg} rounded-full font-bold text-white transition-colors`}>&larr; Back</button> )}
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyPress={handleKeyPress} placeholder="e.g., Attack on Titan" className={`flex-grow max-lg p-3 ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-full ${currentTheme.inputText} ${currentTheme.placeholderText} focus:outline-none focus:ring-2 ${currentTheme.focusRing}`} disabled={isLoading}/>
            <button onClick={handleSearch} disabled={isLoading} className={`px-8 py-3 ${currentTheme.buttonBg} ${currentTheme.buttonHoverBg} rounded-full font-bold text-white transition-colors disabled:bg-gray-600`}>{isLoading ? 'Searching...' : 'Recommend'}</button>
            <div className="w-full sm:w-auto mt-2 sm:mt-0">
              <select onChange={(e) => executeGenreSearch(e.target.value)} disabled={isLoading || genres.length === 0} className={`p-3 w-full sm:w-auto ${currentTheme.selectBg} ${currentTheme.selectBorder} border rounded-full focus:outline-none focus:ring-2 ${currentTheme.focusRing}`}>
                <option value="">Browse by Genre...</option>
                {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
              </select>
            </div>
          </div>
          <p className={`${currentTheme.statusText} italic h-6 px-4 truncate`}>{status}</p>
          {showTrending && (isTrendingLoading ? <TrendingCarouselSkeleton theme={currentTheme}/> : (trendingAnime.length > 0 && <TrendingCarousel animeList={trendingAnime} theme={currentTheme} onCardClick={handleCardClick} />))}
        </div>
        <div className="px-4 sm:px-8 mt-8">
          <main>
            {searchedAnime && !isLoading && (
              <div className="mb-12">
                <div className="flex flex-wrap justify-between items-center mb-4 px-2 gap-4">
                  <h2 className={`text-2xl font-bold ${currentTheme.headerText} text-left`}>{searchedAnime.english_title.startsWith('Top') ? 'Showing Top Anime' : 'Based on Your Search'}</h2>
                  {recommendations.length > 0 && (
                    <select onChange={(e) => setSortOption(e.target.value)} value={sortOption} className={`p-2 rounded-md ${currentTheme.selectBg} ${currentTheme.selectBorder} border`}>
                        <option value="default">Sort by: Default</option>
                        <option value="score">Score: High to Low</option>
                        <option value="az">A-Z</option>
                        <option value="date">Release Date: Newest</option>
                    </select>
                  )}
                </div>
                {!searchedAnime.english_title.startsWith('Top') && (
                  <div className={`flex items-center gap-4 p-4 rounded-lg ${currentTheme.cardBg} text-left mb-6`}>
                      <img src={searchedAnime.image_url} alt={searchedAnime.english_title} className="w-20 h-28 object-cover rounded-md shadow-lg" />
                      <div className="flex-grow">
                          <h3 className={`text-2xl font-bold ${currentTheme.cardTitle}`}>{searchedAnime.english_title}</h3>
                          <p className={`text-lg font-semibold ${currentTheme.cardScore}`}>{searchedAnime.score ? `⭐ ${searchedAnime.score.toFixed(2)}` : 'No Rating'}</p>
                          <button onClick={() => handleCardClick(searchedAnime)} className={`mt-2 px-3 py-1 text-sm rounded-full ${currentTheme.tagBg} ${currentTheme.tagText} ${currentTheme.tagHoverBg} transition-colors`}>
                            View Details
                          </button>
                      </div>
                  </div>
                )}
                <hr className={`my-8 ${currentTheme.inputBorder}`} />
                <h2 className={`text-2xl font-bold ${currentTheme.headerText} mb-4 text-left px-2`}>
                  {searchedAnime.english_title.startsWith('Top') ? `Results for ${currentGenre}` : 'Top Recommendations'}
                </h2>
              </div>
            )}
            {isLoading && <SkeletonGrid theme={currentTheme} />}
            {!isLoading && sortedRecommendations.length > 0 && <RecommendationGrid recommendations={sortedRecommendations} theme={currentTheme} onCardClick={handleCardClick} favorites={favorites} onFavoriteToggle={toggleFavorite}/>}
            {!isLoading && currentGenre && totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} theme={currentTheme} />}
          </main>
        </div>
        {selectedAnime && <AnimeDetailModal anime={selectedAnime} theme={currentTheme} onClose={handleCloseModal} onRecommend={executeSearch} onGenreClick={executeGenreSearch} isFavorited={favorites.some(fav => fav.mal_id === selectedAnime.mal_id)} onFavoriteToggle={toggleFavorite} />}
        {isFavoritesModalOpen && <FavoritesModal favorites={favorites} theme={currentTheme} onClose={() => setIsFavoritesModalOpen(false)} onCardClick={handleCardClick} />}
      </div>
    </div>
  );
}

// Sub-components
function TrendingCarousel({ animeList, theme, onCardClick }) {
  const duplicatedList = [...animeList, ...animeList];
  return (
    <div className="mb-12 group pt-4">
      <h2 className={`text-3xl font-bold ${theme.headerText} text-left mb-4 px-4 sm:px-0`}>🔥 Trending Now</h2>
      <div className={`relative w-full overflow-hidden`}>
        <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
          {duplicatedList.map((anime, index) => (
            <div key={`${anime.mal_id}-${index}`} onClick={() => onCardClick(anime)} className="flex-shrink-0 w-48 mx-3 cursor-pointer">
              <div className="relative transform hover:-translate-y-2 transition-transform duration-300">
                <img src={anime.image_url} alt={anime.english_title} className="w-full h-64 object-cover rounded-lg shadow-lg" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-lg"></div>
                <h3 className="absolute bottom-2 left-2 text-white font-bold text-md">{anime.english_title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function TrendingCarouselSkeleton({ theme }) {
  return (
    <div className="mb-12 animate-pulse pt-4 px-4 sm:px-0">
      <div className={`h-8 w-64 rounded-md ${theme.skeletonBg} mb-4`}></div>
      <div className="flex space-x-6 pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-48">
            <div className={`w-full h-64 rounded-lg ${theme.skeletonBg}`}></div>
            <div className={`h-5 mt-2 rounded-md ${theme.skeletonBg}`}></div>
          </div>
        ))}
      </div>
    </div>
  )
}
const RecommendationGrid = ({ recommendations, theme, onCardClick, favorites, onFavoriteToggle }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 text-left">
    {recommendations.map((anime) => ( <AnimeCard key={anime.mal_id} anime={anime} theme={theme} onCardClick={onCardClick} isFavorited={favorites.some(fav => fav.mal_id === anime.mal_id)} onFavoriteToggle={onFavoriteToggle} /> ))}
  </div>
);
const SkeletonGrid = ({ theme }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 text-left">
    {Array.from({ length: 10 }).map((_, index) => ( <SkeletonCard key={index} theme={theme} /> ))}
  </div>
);
function AnimeCard({ anime, theme, onCardClick, isFavorited, onFavoriteToggle }) {
  const synopsis = anime.synopsis ? anime.synopsis.substring(0, 100) + '...' : 'No synopsis.';
  const score = anime.score ? `⭐ ${anime.score.toFixed(2)}` : 'No Rating';
  
  const handleFavoriteClick = (e) => {
      e.stopPropagation();
      onFavoriteToggle(anime);
  };
  
  return (
    <div onClick={() => onCardClick(anime)} className={`${theme.cardBg} rounded-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 flex flex-col cursor-pointer relative`}>
      <button onClick={handleFavoriteClick} className="absolute top-2 right-2 text-2xl z-10 p-1 bg-black bg-opacity-50 rounded-full">
        {isFavorited ? '❤️' : '🤍'}
      </button>
      <img src={anime.image_url} alt={anime.english_title} className="w-full h-72 object-cover" />
      <div className="p-4 flex flex-col flex-grow">
        <h3 className={`text-lg font-bold ${theme.cardTitle} mb-2 h-14`}>{anime.english_title}</h3>
        <p className={`${theme.cardScore} font-semibold mb-2`}>{score}</p>
        <p className={`text-sm ${theme.cardSynopsis} flex-grow`}>{synopsis}</p>
      </div>
    </div>
  );
}
function SkeletonCard({ theme }) { return ( <div className={`${theme.cardBg} rounded-lg overflow-hidden animate-pulse`}> <div className={`w-full h-72 ${theme.skeletonBg}`}></div> <div className="p-4"> <div className={`h-6 rounded ${theme.skeletonBg} mb-4`}></div> <div className={`h-4 w-1/3 rounded ${theme.skeletonBg} mb-4`}></div> <div className={`h-4 rounded ${theme.skeletonBg}`}></div> <div className={`h-4 w-5/6 rounded ${theme.skeletonBg} mt-2`}></div> </div> </div> ) }
function AnimeDetailModal({ anime, theme, onClose, onRecommend, onGenreClick, isFavorited, onFavoriteToggle }) {
    const score = anime.score ? `⭐ ${anime.score.toFixed(2)}` : 'No Rating';
    const handleOutsideClick = (e) => e.target.id === 'modal-backdrop' && onClose();
    const handleRecommendClick = () => { onClose(); onRecommend(anime.english_title); }
    const handleGenreClick = (genre) => { onClose(); onGenreClick(genre); }
    const handleViewOnMal = () => { if(anime.mal_id) window.open(`https://myanimelist.net/anime/${anime.mal_id}`, '_blank'); }
    return (
        <div id="modal-backdrop" onClick={handleOutsideClick} className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className={`${theme.cardBg} rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row gap-6 p-6 relative`}>
                <button onClick={onClose} className={`absolute top-3 right-4 ${theme.mainText} text-3xl font-bold hover:opacity-75 z-20`}>&times;</button>
                 <button onClick={() => onFavoriteToggle(anime)} className="absolute top-3 right-12 text-2xl z-20 p-1">
                    {isFavorited ? '❤️' : '🤍'}
                </button>
                <img src={anime.image_url} alt={anime.english_title} className="w-full md:w-1/3 h-auto object-cover rounded-lg shadow-lg" />
                <div className="text-left flex-grow">
                    <h2 className={`text-3xl font-bold ${theme.cardTitle} mb-4 pr-16`}>{anime.english_title}</h2>
                    <p className={`${theme.cardScore} font-semibold text-xl mb-4`}>{score}</p>
                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                        <div><span className="font-bold">Type:</span> {anime.type || 'N/A'}</div>
                        <div><span className="font-bold">Episodes:</span> {anime.episodes || 'N/A'}</div>
                        <div><span className="font-bold">Status:</span> {anime.status || 'N/A'}</div>
                    </div>
                    <div className="mb-4">
                         <h4 className="text-lg font-bold mb-2">Genres</h4>
                         <div className="flex flex-wrap gap-2">
                            {anime.genres && anime.genres.map(genre => ( <button key={genre} onClick={() => handleGenreClick(genre)} className={`px-3 py-1 ${theme.tagBg} ${theme.tagText} ${theme.tagHoverBg} rounded-full text-sm transition-colors`}>{genre}</button>))}
                         </div>
                    </div>
                    <h4 className="text-lg font-bold mb-2">Synopsis</h4>
                    <div className={`text-base ${theme.cardSynopsis} pr-4 max-h-48 overflow-y-auto`}>{anime.synopsis || 'No synopsis available.'}</div>
                    <div className="flex flex-wrap gap-4 mt-6">
                      <button onClick={handleRecommendClick} className={`px-6 py-2 ${theme.buttonBg} ${theme.buttonHoverBg} rounded-full font-bold text-white transition-colors`}>Find Similar Anime</button>
                      {anime.mal_id && <button onClick={handleViewOnMal} className={`px-6 py-2 ${theme.backButtonBg} ${theme.backButtonHoverBg} rounded-full font-bold text-white transition-colors`}>View on MyAnimeList</button>}
                    </div>
                </div>
            </div>
        </div>
    );
}
function FavoritesModal({ favorites, theme, onClose, onCardClick }) {
    const handleOutsideClick = (e) => e.target.id === 'favorites-backdrop' && onClose();
    return (
        <div id="favorites-backdrop" onClick={handleOutsideClick} className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className={`${theme.cardBg} rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-6 p-6 relative`}>
                <button onClick={onClose} className={`absolute top-3 right-4 ${theme.mainText} text-3xl font-bold hover:opacity-75 z-20`}>&times;</button>
                <h2 className={`text-3xl font-bold ${theme.headerText} mb-4 text-center`}>My Favorites</h2>
                {favorites.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 text-left">
                        {favorites.map(anime => (
                            <div key={anime.mal_id} onClick={() => { onClose(); onCardClick(anime);}} className={`${theme.cardBg} rounded-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 flex flex-col cursor-pointer`}>
                                <img src={anime.image_url} alt={anime.english_title} className="w-full h-72 object-cover"/>
                                <div className="p-4 flex flex-col flex-grow">
                                    <h3 className={`text-lg font-bold ${theme.cardTitle} mb-2`}>{anime.english_title}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className={`${theme.statusText} text-center`}>You haven't added any favorites yet. Click the heart icon on any anime to save it here!</p>
                )}
            </div>
        </div>
    );
}
function Pagination({ currentPage, totalPages, onPageChange, theme }) {
  return (
    <div className="flex justify-center items-center gap-4 mt-8">
      <button 
        onClick={() => onPageChange(currentPage - 1)} 
        disabled={currentPage <= 1}
        className={`${theme.backButtonBg} ${theme.backButtonHoverBg} text-white font-bold py-2 px-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        &larr; Previous
      </button>
      <span className={`${theme.statusText} font-semibold`}>Page {currentPage} of {totalPages}</span>
      <button 
        onClick={() => onPageChange(currentPage + 1)} 
        disabled={currentPage >= totalPages}
        className={`${theme.backButtonBg} ${theme.backButtonHoverBg} text-white font-bold py-2 px-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        Next &rarr;
      </button>
    </div>
  );
}