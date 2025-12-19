const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const session = require('express-session');
const cors = require('cors');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const User = require('./models/User');
const BookReview = require('./models/BookReview');
const { fetchBookCover, searchIndianBooks, getIndianAuthorRecommendations } = require('./utils/googleBooksApi');

const app = express();
const port = process.env.PORT || 3020;

// Simple logger at the very top
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin || 'None'}`);
    next();
});

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://HetviK2208:HetviK9909855402@cluster0.ih1tunm.mongodb.net/ReadCycle";
mongoose.connect(mongoURI)
    .then(() => {
        console.log(`✅ MongoDB connected successfully to ${mongoose.connection.name}`);
    })
    .catch(err => console.error("❌ MongoDB connection error:", err));

// Trust the Render proxy for secure cookies
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:3000',
    'https://' + process.env.RENDER_EXTERNAL_HOSTNAME // Automatically get Render domain
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'book-cycle-stable-secret-key-123', // Stable secret for testing
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoURI,
        ttl: 14 * 24 * 60 * 60, // Standard TTL
        autoRemove: 'native'
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production' || !!process.env.RENDER,
        sameSite: 'lax', // Better for same-domain deployment
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Auth Middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }
    next();
};

// --- ROUTES ---

// Auth Routes
app.post('/api/signup', async (req, res) => {
    const { fullname, userid, no, email, address, password, verifyPassword } = req.body;

    if (password !== verifyPassword) {
        return res.status(400).json({ error: "Passwords do not match." });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ userid }, { email }, { phone: no }] });
        if (existingUser) {
            console.log(`❌ Signup failed: User already exists (${userid}, ${email}, ${no})`);
            return res.status(400).json({ error: "User with this ID, Email or Phone already exists." });
        }

        const newUser = new User({
            fullname,
            userid,
            phone: no,
            email,
            address,
            password,
            credits: 20
        });

        await newUser.save();

        req.session.user = {
            id: newUser._id,
            userid: newUser.userid,
            fullname: newUser.fullname,
            email: newUser.email
        };

        res.json({ message: "User registered successfully!", user: req.session.user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { identifier, password } = req.body;

    try {
        const user = await User.findOne({ $or: [{ email: identifier }, { userid: identifier }] });
        if (!user) {
            console.log(`❌ Login failed: User not found (${identifier})`);
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log(`❌ Login failed: Incorrect password for ${identifier}`);
            return res.status(401).json({ error: "Invalid credentials." });
        }

        req.session.user = {
            id: user._id,
            userid: user.userid,
            fullname: user.fullname,
            email: user.email
        };

        res.json({ message: "Login successful!", user: req.session.user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/me', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
    try {
        const user = await User.findById(req.session.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reads', requireAuth, async (req, res) => {
    const { title, author, genre, ideas } = req.body;
    try {
        await User.findByIdAndUpdate(req.session.user.id, {
            $push: { myReads: { title, author, genre, ideas, readAt: new Date() } }
        });
        res.json({ message: "Read logged!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reads', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.json(user.myReads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: "Logged out" });
});

app.get('/api/test-db', async (req, res) => {
    try {
        const count = await User.countDocuments();
        res.json({
            status: "Connected",
            database: mongoose.connection.name,
            userCount: count
        });
    } catch (error) {
        res.status(500).json({ status: "Error", error: error.message });
    }
});

// Book Management Routes
app.post('/api/books', requireAuth, async (req, res) => {
    const { title, author, genre, condition, description, coverImage } = req.body;
    const userId = req.session.user.id;

    try {
        const bookData = await fetchBookCover(title, author);
        const newBook = {
            _id: new mongoose.Types.ObjectId(),
            title,
            author,
            genre: genre || bookData?.categories?.[0] || 'Uncategorized',
            condition: condition || 'Good',
            description: description || bookData?.description,
            coverImage: coverImage || bookData?.coverImage,
            status: 'available'
        };

        await User.findByIdAndUpdate(userId, { $push: { myBooks: newBook } });
        res.json({ message: "Book added!", book: newBook });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/my-books', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.json(user.myBooks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/books/:id', async (req, res) => {
    try {
        const bookId = req.params.id;
        const user = await User.findOne({ 'myBooks._id': bookId });

        if (!user) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const book = user.myBooks.id(bookId);
        res.json({
            ...book.toObject(),
            owner: {
                id: user._id,
                fullname: user.fullname,
                userid: user.userid,
                address: user.address,
                phone: user.phone
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/browse', async (req, res) => {
    try {
        const { search, genre } = req.query;
        let query = { 'myBooks.status': 'available' };

        // In a real app with many users, you'd aggregate or use a separate Book collection
        // For this prototype, we'll scan users
        const users = await User.find(query);
        let allBooks = [];
        users.forEach(u => {
            u.myBooks.forEach(b => {
                if (b.status === 'available') {
                    // Flattening for the frontend
                    allBooks.push({
                        ...b.toObject(),
                        owner: { id: u._id, fullname: u.fullname, userid: u.userid, address: u.address }
                    });
                }
            });
        });

        if (search) {
            allBooks = allBooks.filter(b =>
                b.title.toLowerCase().includes(search.toLowerCase()) ||
                b.author.toLowerCase().includes(search.toLowerCase())
            );
        }
        if (genre && genre !== 'All') {
            allBooks = allBooks.filter(b => b.genre === genre);
        }

        res.json(allBooks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/requests', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.json({
            incoming: user.requestedBooks,
            outgoing: user.bookRequests
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Exchange Request Routes
app.post('/api/requests', requireAuth, async (req, res) => {
    const { bookId, ownerId, message } = req.body;
    const requesterId = req.session.user.id;

    try {
        const requester = await User.findById(requesterId);
        if (requester.credits < 10) return res.status(400).json({ error: "Insufficient credits" });

        const owner = await User.findById(ownerId);
        const book = owner.myBooks.id(bookId);

        if (!book || book.status !== 'available') return res.status(400).json({ error: "Book not available" });

        const requestId = new mongoose.Types.ObjectId();
        const requestData = {
            _id: requestId,
            bookId,
            bookTitle: book.title,
            bookAuthor: book.author,
            requesterId,
            requesterName: requester.fullname,
            requesterUserId: requester.userid,
            requesterPhone: requester.phone,
            requesterAddress: requester.address,
            ownerId,
            ownerName: owner.fullname,
            ownerUserId: owner.userid,
            ownerAddress: owner.address,
            message,
            status: 'pending'
        };

        // Add to both users
        await User.findByIdAndUpdate(ownerId, { $push: { requestedBooks: requestData } });
        await User.findByIdAndUpdate(requesterId, { $push: { bookRequests: requestData } });

        res.json({ message: "Request sent!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Recommendations Logic
let cachedTrendingBooks = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

async function getDefaultRecommendations() {
    const now = Date.now();
    if (cachedTrendingBooks && (now - lastCacheUpdate < CACHE_DURATION)) {
        console.log("📚 Returning cached trending recommendations");
        return cachedTrendingBooks;
    }

    try {
        console.log("🌐 Fetching fresh trending recommendations from Google Books");
        const books = await searchIndianBooks('popular fiction', 12);
        cachedTrendingBooks = books.map(b => ({ ...b, recommendationType: 'Trending', matchReason: 'Popular in India' }));
        lastCacheUpdate = now;
        return cachedTrendingBooks;
    } catch (error) {
        console.error("❌ Failed to fetch trending books:", error);
        return cachedTrendingBooks || []; // Return old cache if available
    }
}

app.get('/api/recommendations', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.json(await getDefaultRecommendations());
        }

        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.json(await getDefaultRecommendations());
        }

        const myBooks = user.myBooks || [];
        const myReads = user.myReads || [];
        const allBooks = [...myBooks, ...myReads];

        if (allBooks.length === 0) {
            return res.json(await getDefaultRecommendations());
        }

        // Extract and weight interests
        const authors = allBooks.map(b => b.author).filter(Boolean);
        const genres = allBooks.map(b => b.genre).filter(Boolean);

        const uniqueAuthors = [...new Set(authors)];
        const uniqueGenres = [...new Set(genres)];

        let recommendations = [];

        // 1. Recommend books from authors the user likes (upto 3 authors)
        if (uniqueAuthors.length > 0) {
            const shuffledAuthors = uniqueAuthors.sort(() => 0.5 - Math.random()).slice(0, 3);
            for (const author of shuffledAuthors) {
                const authorRecs = await getIndianAuthorRecommendations(author, 4);
                recommendations.push(...authorRecs.map(r => ({
                    ...r,
                    recommendationType: 'Author Match',
                    matchReason: `Because you enjoy ${author}`
                })));
            }
        }

        // 2. Recommend books in genres the user likes (upto 3 genres)
        if (uniqueGenres.length > 0) {
            const shuffledGenres = uniqueGenres.sort(() => 0.5 - Math.random()).slice(0, 3);
            for (const genre of shuffledGenres) {
                const genreRecs = await searchIndianBooks(genre, 4);
                recommendations.push(...genreRecs.map(r => ({
                    ...r,
                    recommendationType: 'Genre Match',
                    matchReason: `Matches your interest in ${genre}`
                })));
            }
        }

        // Filter out books the user already has/read
        const existingTitles = new Set(allBooks.map(b => b.title.toLowerCase()));
        recommendations = recommendations.filter(r => !existingTitles.has(r.title.toLowerCase()));

        // Add defaults if we need more variety until we hit at least 15 for filtering/shuffling
        if (recommendations.length < 10) {
            const trending = await getDefaultRecommendations();
            recommendations.push(...trending);
        }

        // Handle duplicates by title and shuffle
        const seen = new Set();
        const finalRecs = recommendations.filter(el => {
            const duplicate = seen.has(el.title);
            seen.add(el.title);
            return !duplicate;
        }).sort(() => 0.5 - Math.random());

        res.json(finalRecs.slice(0, 10));
    } catch (error) {
        console.error("Recommendation error:", error);
        res.json(await getDefaultRecommendations());
    }
});

app.post('/api/accept-request', requireAuth, async (req, res) => {
    try {
        const { requestId, exchangeAddress, exchangeTime, exchangeMessage } = req.body;
        const userId = req.session.user.id;
        const userIdObj = new mongoose.Types.ObjectId(userId);
        const requestIdObj = new mongoose.Types.ObjectId(requestId);

        const owner = await User.findOne({
            _id: userIdObj,
            'requestedBooks._id': requestIdObj
        });

        if (!owner) return res.status(404).json({ error: 'Request not found' });

        const request = owner.requestedBooks.find(req => req._id.equals(requestIdObj));
        const requesterData = await User.findById(request.requesterId);

        if (requesterData.credits < 10) {
            return res.status(400).json({ error: 'Requester does not have enough credits' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await User.updateOne(
                { _id: userIdObj, 'requestedBooks._id': requestIdObj },
                {
                    $set: {
                        'requestedBooks.$.status': 'accepted',
                        'requestedBooks.$.exchangeAddress': exchangeAddress || owner.address,
                        'requestedBooks.$.exchangeTime': new Date(exchangeTime || Date.now() + 86400000),
                        'requestedBooks.$.message': exchangeMessage || request.message
                    }
                },
                { session }
            );

            await User.updateOne(
                { _id: request.requesterId, 'bookRequests._id': requestIdObj },
                {
                    $set: {
                        'bookRequests.$.status': 'accepted',
                        'bookRequests.$.exchangeAddress': exchangeAddress || owner.address,
                        'bookRequests.$.exchangeTime': new Date(exchangeTime || Date.now() + 86400000),
                        'bookRequests.$.message': exchangeMessage || request.message
                    }
                },
                { session }
            );

            await User.updateOne({ _id: request.requesterId }, { $inc: { credits: -10 } }, { session });
            await User.updateOne({ _id: userIdObj }, { $inc: { credits: 10 } }, { session });
            await User.updateOne({ _id: userIdObj, 'myBooks._id': request.bookId }, { $set: { 'myBooks.$.status': 'borrowed' } }, { session });

            await session.commitTransaction();
            res.json({ message: 'Request accepted successfully!' });
        } catch (error) {
            await session.abortTransaction();
            res.status(500).json({ error: 'Failed to accept request' });
        } finally {
            session.endSession();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reject-request', requireAuth, async (req, res) => {
    try {
        const { requestId } = req.body;
        const userId = req.session.user.id;
        const requestIdObj = new mongoose.Types.ObjectId(requestId);

        const owner = await User.findOne({ _id: userId, 'requestedBooks._id': requestIdObj });
        if (!owner) return res.status(404).json({ error: 'Request not found' });

        const request = owner.requestedBooks.find(r => r._id.equals(requestIdObj));

        await User.updateOne({ _id: userId, 'requestedBooks._id': requestIdObj }, { $set: { 'requestedBooks.$.status': 'rejected' } });
        await User.updateOne({ _id: request.requesterId, 'bookRequests._id': requestIdObj }, { $set: { 'bookRequests.$.status': 'rejected' } });

        res.json({ message: 'Request rejected' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve Static Files from React Frontend
app.use(express.static(path.join(__dirname, '../dist')));

// Catch-all route to serve the React index.html for any non-API routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
