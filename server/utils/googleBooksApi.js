const axios = require('axios');

const fetchBookCover = async (title, author) => {
    try {
        const query = `intitle:${title}${author ? `+inauthor:${author}` : ''}`;
        const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`);

        if (response.data.items && response.data.items.length > 0) {
            const book = response.data.items[0].volumeInfo;
            return {
                coverImage: book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || '',
                description: book.description || '',
                pageCount: book.pageCount,
                publishedDate: book.publishedDate,
                categories: book.categories
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching from Google Books:', error.message);
        return null;
    }
};

const searchIndianBooks = async (query = '', limit = 10) => {
    try {
        // Adding keywords to focus on Indian literature if query is empty or general
        const searchQuery = query ? `${query}+Indian` : 'Indian+Literature+fiction';
        const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=${limit}`);

        if (response.data.items) {
            return response.data.items.map(item => ({
                title: item.volumeInfo.title,
                authors: item.volumeInfo.authors || ['Unknown'],
                coverImage: item.volumeInfo.imageLinks?.thumbnail || '',
                description: item.volumeInfo.description,
                averageRating: item.volumeInfo.averageRating
            }));
        }
        return [];
    } catch (error) {
        console.error('Error searching Indian books:', error.message);
        return [];
    }
};

const getIndianAuthorRecommendations = async (author, limit = 5) => {
    try {
        const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(author)}&maxResults=${limit}`);

        if (response.data.items) {
            return response.data.items.map(item => ({
                title: item.volumeInfo.title,
                authors: item.volumeInfo.authors || ['Unknown'],
                coverImage: item.volumeInfo.imageLinks?.thumbnail || '',
                description: item.volumeInfo.description,
                averageRating: item.volumeInfo.averageRating
            }));
        }
        return [];
    } catch (error) {
        console.error('Error getting author recommendations:', error.message);
        return [];
    }
};

const isIndianAuthor = (author) => {
    // A very simple check - in a real app this might use a database or more complex heuristic
    const indianNames = ['r.k. narayan', 'arundhati roy', 'vikram seth', 'salman rushdie', 'anita desai', 'khushwant singh', 'chetan bhagat', 'amish tripathi'];
    return indianNames.some(name => author.toLowerCase().includes(name));
};

module.exports = {
    fetchBookCover,
    searchIndianBooks,
    getIndianAuthorRecommendations,
    isIndianAuthor
};
