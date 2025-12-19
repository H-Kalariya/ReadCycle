const mongoose = require('mongoose');

const bookReviewSchema = new mongoose.Schema({
    bookTitle: { type: String, required: true },
    bookAuthor: { type: String, required: true },
    bookCover: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: String,
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BookReview', bookReviewSchema);
