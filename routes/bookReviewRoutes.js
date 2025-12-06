const express = require('express');
const router = express.Router();
const BookReview = require('../models/BookReview');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');
const axios = require('axios');

// @route   POST /api/reviews
// @desc    Add a new book review
// @access  Private
router.post('/', ensureAuthenticated, async (req, res) => {
    try {
        const { bookId, bookTitle, rating, review } = req.body;

        // Check if user already reviewed this book
        const existingReview = await BookReview.findOne({
            bookId,
            userId: req.user.id
        });

        if (existingReview) {
            return res.status(400).json({ msg: 'You have already reviewed this book' });
        }

        const newReview = new BookReview({
            bookId,
            bookTitle,
            userId: req.user.id,
            userName: req.user.name,
            rating,
            review
        });

        await newReview.save();
        res.json(newReview);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/reviews/book/:bookId
// @desc    Get all reviews for a book
// @access  Public
router.get('/book/:bookId', async (req, res) => {
    try {
        const reviews = await BookReview.find({ bookId: req.params.bookId })
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/reviews/user/:userId
// @desc    Get all reviews by a user
// @access  Public
router.get('/user/:userId', async (req, res) => {
    try {
        const reviews = await BookReview.find({ userId: req.params.userId })
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/reviews/recommendations
// @desc    Get personalized book recommendations based on user's reading history
// @access  Private
router.get('/recommendations', ensureAuthenticated, async (req, res) => {
    try {
        console.log('Fetching personalized recommendations for user:', req.user.id);
        
        // 1. Get user's reading history (myReads and myBooks)
        const user = await User.findById(req.user.id)
            .select('myReads myBooks')
            .lean();
            
        // Extract user's preferred authors and genres
        const userPreferences = {
            authors: new Set(),
            genres: new Set()
        };

        // Process myReads
        (user.myReads || []).forEach(read => {
            if (read.author) userPreferences.authors.add(read.author.toLowerCase().trim());
            if (read.genre) userPreferences.genres.add(read.genre.toLowerCase().trim());
        });

        // Process myBooks
        (user.myBooks || []).forEach(book => {
            if (book.author) userPreferences.authors.add(book.author.toLowerCase().trim());
            if (book.genre) userPreferences.genres.add(book.genre.toLowerCase().trim());
        });

        console.log('User preferences:', {
            authors: Array.from(userPreferences.authors),
            genres: Array.from(userPreferences.genres)
        });

        // 2. Prepare search queries based on user preferences
        const minRecommendations = 10;
        const recommendations = [];
        const seenBookIds = new Set();
        
        // Helper function to fetch books from Google Books API
        const fetchBooks = async (query, priority = 0, matchReason = '') => {
            try {
                const response = await axios.get(
                    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&orderBy=relevance&printType=books`
                );
                return (response.data.items || []).map(book => ({
                    ...book,
                    _priority: priority,
                    _matchReason: matchReason
                }));
            } catch (error) {
                console.error(`Error fetching books for query "${query}":`, error.message);
                return [];
            }
        };

        // 3. Create search queries based on user preferences
        const searchQueries = [];
        
        // High priority: Books by user's favorite authors
        userPreferences.authors.forEach(author => {
            searchQueries.push({
                query: `inauthor:"${author}"`,
                priority: 2, // Highest priority
                matchReason: `From your favorite author: ${author}`
            });
        });
        
        // Medium priority: Books in user's favorite genres
        userPreferences.genres.forEach(genre => {
            searchQueries.push({
                query: `subject:"${genre}"`,
                priority: 1,
                matchReason: `In your favorite genre: ${genre}`
            });
        });
        
        // Fallback queries if we don't have enough preferences
        if (userPreferences.authors.size === 0 && userPreferences.genres.size === 0) {
            searchQueries.push(
                { query: 'bestselling fiction', priority: 0, matchReason: 'Popular fiction books' },
                { query: 'new releases', priority: 0, matchReason: 'New book releases' },
                { query: 'award winning books', priority: 0, matchReason: 'Award-winning books' }
            );
        }

        // 4. Execute searches and collect results
        const allBooks = [];
        for (const { query, priority, matchReason } of searchQueries) {
            console.log(`Searching for: ${query} (Priority: ${priority})`);
            const books = await fetchBooks(query, priority, matchReason);
            allBooks.push(...books);
        }

        // 5. Process and sort books
        const processedBooks = [];
        for (const book of allBooks) {
            if (!book.volumeInfo) continue;
            
            const { title, authors, description, imageLinks, categories, averageRating, ratingsCount } = book.volumeInfo;
            const bookId = book.id;
            
            // Skip if we've already included this book or missing essential info
            if (seenBookIds.has(bookId) || !title || !authors || !authors.length) continue;
            seenBookIds.add(bookId);
            
            // Calculate relevance score based on priority and rating
            const ratingScore = (averageRating || 0) * 2; // Give more weight to rating
            const relevanceScore = book._priority * 5 + ratingScore;
            
            processedBooks.push({
                bookId,
                bookTitle: title,
                bookAuthor: authors.join(', '),
                bookCover: imageLinks?.thumbnail || null,
                description: description ? description.substring(0, 200) + '...' : 'No description available',
                genre: categories ? categories[0] : 'General',
                averageRating: averageRating || 0,
                reviewCount: ratingsCount || 0,
                matchReason: book._matchReason || 'Recommended for you',
                previewLink: book.volumeInfo.previewLink || null,
                _relevanceScore: relevanceScore
            });
        }

        // 6. Sort by relevance score (highest first)
        processedBooks.sort((a, b) => b._relevanceScore - a._relevanceScore);
        
        // 7. Take top recommendations and remove the temporary _relevanceScore
        const topRecommendations = processedBooks
            .slice(0, minRecommendations)
            .map(({ _relevanceScore, ...rest }) => rest);
        
        // 8. If we still don't have enough, add some popular books
        if (topRecommendations.length < minRecommendations) {
            const remaining = minRecommendations - topRecommendations.length;
            console.log(`Adding ${remaining} popular books to reach minimum recommendations`);
            
            const popularBooks = await fetchBooks('bestselling books');
            
            for (const book of popularBooks) {
                if (topRecommendations.length >= minRecommendations) break;
                if (!book.volumeInfo) continue;
                
                const { title, authors, description, imageLinks, categories, averageRating, ratingsCount } = book.volumeInfo;
                const bookId = book.id;
                
                if (seenBookIds.has(bookId) || !title || !authors || !authors.length) continue;
                seenBookIds.add(bookId);
                
                topRecommendations.push({
                    bookId,
                    bookTitle: title,
                    bookAuthor: authors.join(', '),
                    bookCover: imageLinks?.thumbnail || null,
                    description: description ? description.substring(0, 200) + '...' : 'No description available',
                    genre: categories ? categories[0] : 'General',
                    averageRating: averageRating || 0,
                    reviewCount: ratingsCount || 0,
                    matchReason: 'Popular book you might like',
                    previewLink: book.volumeInfo.previewLink || null
                });
            }
        }

        console.log(`Returning ${topRecommendations.length} recommendations`);
        res.json(topRecommendations);
        
    } catch (err) {
        console.error('Recommendation API Error:', err);
        
        // Fallback to static recommendations if API fails
        const fallbackRecommendations = [
            {
                bookId: 'fallback-1',
                bookTitle: 'The Great Gatsby',
                bookAuthor: 'F. Scott Fitzgerald',
                bookCover: 'https://books.google.com/books/content?id=iXn5U2jFQ2QC&printsec=frontcover&img=1&zoom=1&source=gbs_api',
                description: 'A story of decadence and excess, The Great Gatsby is a classic of American literature.',
                genre: 'Classic',
                averageRating: 3.9,
                reviewCount: 1200,
                matchReason: 'Classic literature',
                previewLink: 'https://books.google.com/books?id=iXn5U2jFQ2QC&printsec=frontcover&source=gbs_ge_summary_r&cad=0'
            },
            {
                bookId: 'fallback-2',
                bookTitle: 'To Kill a Mockingbird',
                bookAuthor: 'Harper Lee',
                bookCover: 'https://books.google.com/books/content?id=PGR2AwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
                description: 'The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it.',
                genre: 'Classic',
                averageRating: 4.3,
                reviewCount: 2500,
                matchReason: 'Classic literature',
                previewLink: 'https://books.google.com/books?id=PGR2AwAAQBAJ&printsec=frontcover&source=gbs_ge_summary_r&cad=0'
            }
        ];
        
        res.json(fallbackRecommendations);
    }
});

// Function to get popular books as fallback
async function getPopularBooks(count, excludeTitles = new Set()) {
    try {
        console.log(`Fetching ${count} popular books`);
        const allUsers = await User.find({});
        const popularBooks = [];
        const seenTitles = new Set();
        
        // First pass: Get all available books that aren't excluded
        allUsers.forEach(user => {
            user.myBooks.forEach(book => {
                const titleLower = book.title.toLowerCase();
                if (book.status === 'available' && !excludeTitles.has(titleLower) && !seenTitles.has(titleLower)) {
                    popularBooks.push({
                        title: book.title,
                        author: book.author,
                        genre: book.genre,
                        description: book.description,
                        ownerName: user.fullname,
                        ownerId: user._id,
                        score: 0, // No score for popular books
                        genreScore: 0,
                        authorScore: 0,
                        hasGenreMatch: false,
                        hasAuthorMatch: false
                    });
                    seenTitles.add(titleLower);
                }
            });
        });
        
        // If we don't have enough books, do a second pass with less strict criteria
        if (popularBooks.length < count) {
            console.log(`Only found ${popularBooks.length} popular books, looking for more`);
            const additionalBooks = [];
            
            allUsers.forEach(user => {
                user.myBooks.forEach(book => {
                    const titleLower = book.title.toLowerCase();
                    if (book.status === 'available' && 
                        !excludeTitles.has(titleLower) && 
                        !seenTitles.has(titleLower)) {
                        additionalBooks.push({
                            title: book.title,
                            author: book.author,
                            genre: book.genre,
                            description: book.description,
                            ownerName: user.fullname,
                            ownerId: user._id,
                            score: -1, // Mark as less preferred
                            genreScore: 0,
                            authorScore: 0,
                            hasGenreMatch: false,
                            hasAuthorMatch: false
                        });
                        seenTitles.add(titleLower);
                    }
                });
            });
            
            // Add the additional books to our popular books
            popularBooks.push(...additionalBooks);
        }
        
        // Shuffle and take the requested number of books
        const shuffled = [...popularBooks]
            .sort((a, b) => b.score - a.score) // Sort by score (preferred books first)
            .slice(0, count);
        
        console.log(`Returning ${shuffled.length} popular books`);
        
        // Enrich with cover images
        return Promise.all(shuffled.map(book => {
            // If it's a less preferred book, mark it as such
            if (book.score === -1) {
                book.matchReason = 'Recommended from our collection';
            }
            return enrichBookWithCover(book);
        }));
    } catch (error) {
        console.error('Error getting popular books:', error);
        return [];
    }
}

module.exports = router;
