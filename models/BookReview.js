const mongoose = require('mongoose');

const bookReviewSchema = new mongoose.Schema({
    bookTitle: {
        type: String,
        required: true,
        index: true
    },
    bookAuthor: {
        type: String,
        required: true
    },
    bookCover: String,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    review: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for faster querying
bookReviewSchema.index({ bookTitle: 1, userId: 1 }, { unique: true });
bookReviewSchema.index({ bookTitle: 1 });

// Static method to get average rating for a book
bookReviewSchema.statics.getAverageRating = async function(bookTitle) {
    const result = await this.aggregate([
        {
            $match: { bookTitle: bookTitle }
        },
        {
            $group: {
                _id: '$bookId',
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
            }
        }
    ]);

    try {
        // We don't need to update a Book model since we're not using it
        // The rating will be calculated on the fly when displaying
    } catch (err) {
        console.error('Error updating book rating:', err);
    }
};

// Call getAverageRating after save
bookReviewSchema.post('save', function() {
    this.constructor.getAverageRating(this.bookTitle);
});

// Call getAverageRating before remove
bookReviewSchema.post('remove', function() {
    this.constructor.getAverageRating(this.bookTitle);
});

module.exports = mongoose.model('BookReview', bookReviewSchema);
