// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Function to fetch search results from API
async function fetchSearchResults(query) {
    try {
        const response = await fetch(`https://archimartbd.com/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching search results:', error);
        return [];
    }
}

// Function to display search results
function displaySearchResults(data) {
    const searchResultsContainer = document.getElementById('search-results');
    
    if (!data || !data.results || data.results.length === 0) {
        searchResultsContainer.style.display = 'none';
        return;
    }

    // Limit to 10 results
    const limitedResults = data.results.slice(0, 10);
    
    const resultsHtml = limitedResults.map(result => `
        <div class="search-result-item" onclick="window.location.href='Details.html?id=${result.id}'">
            <img src="${result.images && result.images.length > 0 ? result.images[0] : 'placeholder-image.jpg'}" 
                 alt="${result.name}" 
                 class="result-image">
            <div class="result-details">
                <h4>${result.name}</h4>
                <p class="result-price">${result.price} ${result.currency}</p>
                <p class="result-category">${result.category} > ${result.subcategory} > ${result.subsubcategory}</p>
            </div>
        </div>
    `).join('');

    searchResultsContainer.innerHTML = resultsHtml;
    searchResultsContainer.style.display = 'block';
}

// Initialize search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('main_search');
    const searchResultsContainer = document.getElementById('search-results');

    // Create debounced search function
    const debouncedSearch = debounce(async (query) => {
        if (query.length < 2) {
            searchResultsContainer.style.display = 'none';
            return;
        }
        
        const results = await fetchSearchResults(query);
        displaySearchResults(results);
    }, 500);

    // Add event listeners
    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResultsContainer.contains(e.target)) {
            searchResultsContainer.style.display = 'none';
        }
    });
});