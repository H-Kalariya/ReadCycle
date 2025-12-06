const axios = require('axios');

// Google Books API configuration
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';
const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

// Popular Indian authors for recommendations
const INDIAN_AUTHORS = [
    'R.K. Narayan',
    'Ruskin Bond',
    'Amitav Ghosh',
    'Arundhati Roy',
    'Chetan Bhagat',
    'Vikram Seth',
    'Salman Rushdie',
    'Jhumpa Lahiri',
    'Anita Desai',
    'Kiran Desai',
    'Shashi Tharoor',
    'Khushwant Singh',
    'Aravind Adiga',
    'Rohinton Mistry',
    'Rabindranath Tagore',
    'Premchand',
    'Mulk Raj Anand',
    'Raja Rao',
    'Kamala Markandaya',
    'Anita Nair'
];

/**
 * Fetch book cover and details from Open Library API (No API key required!)
 * @param {string} title - Book title
 * @param {string} author - Book author (optional)
 * @returns {Promise<Object>} Book details including cover image URL
 */
async function fetchBookCover(title, author = '') {
    try {
        // First, search for the book
        let searchQuery = title;
        if (author) {
            searchQuery += ` ${author}`;
        }

        const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=1`;
        const searchResponse = await axios.get(searchUrl);

        if (searchResponse.data.docs && searchResponse.data.docs.length > 0) {
            const book = searchResponse.data.docs[0];

            // Get cover image URL
            let coverImage = '';
            if (book.cover_i) {
                // Use the cover ID to get the image
                coverImage = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
            } else if (book.isbn && book.isbn[0]) {
                // Fallback to ISBN if available
                coverImage = `https://covers.openlibrary.org/b/isbn/${book.isbn[0]}-L.jpg`;
            }

            return {
                success: true,
                title: book.title || title,
                authors: book.author_name || [author],
                coverImage: coverImage,
                description: book.first_sentence ? book.first_sentence.join(' ') : '',
                publisher: book.publisher ? book.publisher[0] : '',
                publishedDate: book.first_publish_year ? book.first_publish_year.toString() : '',
                pageCount: book.number_of_pages_median || 0,
                categories: book.subject ? book.subject.slice(0, 3) : []
            };
        }

        return {
            success: false,
            message: 'No book found matching the search criteria'
        };
    } catch (error) {
        console.error('Error fetching book cover from Open Library API:', error.message);
        return {
            success: false,
            message: 'Error fetching book details',
            error: error.message
        };
    }
}

/**
 * Search for Indian books using Open Library API (No API key required!)
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results (default: 10)
 * @returns {Promise<Array>} List of Indian books
 */
async function searchIndianBooks(query = '', maxResults = 10) {
    try {
        // Search for books by Indian authors
        const author = INDIAN_AUTHORS[Math.floor(Math.random() * INDIAN_AUTHORS.length)];
        const searchQuery = query ? `${query} ${author}` : author;

        const url = `https://openlibrary.org/search.json?author=${encodeURIComponent(author)}&limit=${maxResults}`;
        const response = await axios.get(url);

        if (response.data.docs && response.data.docs.length > 0) {
            return response.data.docs.map(book => {
                let coverImage = '';
                if (book.cover_i) {
                    coverImage = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
                } else if (book.isbn && book.isbn[0]) {
                    coverImage = `https://covers.openlibrary.org/b/isbn/${book.isbn[0]}-M.jpg`;
                }

                return {
                    title: book.title,
                    authors: book.author_name || [],
                    coverImage: coverImage,
                    description: book.first_sentence ? book.first_sentence.join(' ') : '',
                    publisher: book.publisher ? book.publisher[0] : '',
                    publishedDate: book.first_publish_year ? book.first_publish_year.toString() : '',
                    pageCount: book.number_of_pages_median || 0,
                    categories: book.subject ? book.subject.slice(0, 3) : [],
                    averageRating: book.ratings_average || 0,
                    ratingsCount: book.ratings_count || 0
                };
            });
        }

        return [];
    } catch (error) {
        console.error('Error searching Indian books:', error.message);
        return [];
    }
}

/**
 * Get book recommendations by author using Open Library API (No API key required!)
 * @param {string} authorName - Author name to search for similar books
 * @param {number} maxResults - Maximum number of results (default: 5)
 * @returns {Promise<Array>} List of recommended books
 */
async function getIndianAuthorRecommendations(authorName, maxResults = 5) {
    try {
        const url = `https://openlibrary.org/search.json?author=${encodeURIComponent(authorName)}&limit=${maxResults}`;
        const response = await axios.get(url);

        if (response.data.docs && response.data.docs.length > 0) {
            return response.data.docs.map(book => {
                let coverImage = '';
                if (book.cover_i) {
                    coverImage = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
                } else if (book.isbn && book.isbn[0]) {
                    coverImage = `https://covers.openlibrary.org/b/isbn/${book.isbn[0]}-M.jpg`;
                }

                return {
                    title: book.title,
                    authors: book.author_name || [],
                    coverImage: coverImage,
                    description: book.first_sentence ? book.first_sentence.join(' ') : '',
                    averageRating: book.ratings_average || 0,
                    ratingsCount: book.ratings_count || 0,
                    categories: book.subject ? book.subject.slice(0, 3) : []
                };
            });
        }

        return [];
    } catch (error) {
        console.error('Error getting author recommendations:', error.message);
        return [];
    }
}

/**
 * Check if an author is in the Indian authors list
 * @param {string} authorName - Author name to check
 * @returns {boolean} True if author is Indian
 */
function isIndianAuthor(authorName) {
    const normalizedName = authorName.toLowerCase();
    return INDIAN_AUTHORS.some(indianAuthor =>
        normalizedName.includes(indianAuthor.toLowerCase()) ||
        indianAuthor.toLowerCase().includes(normalizedName)
    );
}

module.exports = {
    fetchBookCover,
    searchIndianBooks,
    getIndianAuthorRecommendations,
    isIndianAuthor,
    INDIAN_AUTHORS
};
