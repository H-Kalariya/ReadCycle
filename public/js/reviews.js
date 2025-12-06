// Review System
class BookReviewSystem {
    constructor() {
        this.reviewForm = document.getElementById('review-form');
        this.reviewsContainer = document.getElementById('reviews-container');
        this.bookTitle = document.getElementById('book-title')?.value;
        this.bookAuthor = document.getElementById('book-author')?.value;
        this.bookCover = document.getElementById('book-cover')?.value;

        if (this.reviewForm) {
            this.reviewForm.addEventListener('submit', this.handleReviewSubmit.bind(this));
        }

        this.loadReviews();
    }

    async handleReviewSubmit(e) {
        e.preventDefault();

        if (!this.bookTitle || !this.bookAuthor) {
            alert('Error: Book information not found');
            return;
        }

        const rating = this.reviewForm.querySelector('input[name="rating"]:checked');
        const reviewText = this.reviewForm.querySelector('textarea').value.trim();

        if (!rating || !reviewText) {
            alert('Please provide both a rating and a review');
            return;
        }

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bookTitle: this.bookTitle,
                    bookAuthor: this.bookAuthor,
                    bookCover: this.bookCover,
                    rating: parseInt(rating.value),
                    review: reviewText
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.reviewForm.reset();
                this.loadReviews();
            } else {
                alert(data.msg || 'Failed to submit review');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('An error occurred while submitting your review');
        }
    }

    async loadReviews() {
        if (!this.bookTitle) return;

        try {
            const response = await fetch(`/api/reviews/book/${encodeURIComponent(this.bookTitle)}`);
            const { reviews, stats } = await response.json();
            this.displayReviews(reviews || []);
            this.updateRatingDisplay(stats);
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    }

    updateRatingDisplay(stats) {
        if (!stats) return;

        const ratingElement = document.querySelector('.rating-stars');
        const ratingValue = document.querySelector('.rating-value');

        if (ratingElement) {
            ratingElement.innerHTML =
                '★'.repeat(Math.round(stats.averageRating)) +
                '☆'.repeat(5 - Math.round(stats.averageRating));
        }

        if (ratingValue) {
            ratingValue.textContent = `${stats.averageRating.toFixed(1)} (${stats.reviewCount} reviews)`;
        }
    }

    displayReviews(reviews) {
        if (!this.reviewsContainer) return;

        if (!reviews || reviews.length === 0) {
            this.reviewsContainer.innerHTML = '<p>No reviews yet. Be the first to review this book!</p>';
            return;
        }

        this.reviewsContainer.innerHTML = reviews.map(review => `
            <div class="review">
                <div class="review-header">
                    <span class="reviewer">${review.userName}</span>
                    <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
                    <div class="review-rating">
                        ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                    </div>
                </div>
                <p class="review-text">${review.review}</p>
            </div>
        `).join('');
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Recommendation System
class BookRecommendationSystem {
    constructor() {
        this.recommendationsContainer = document.getElementById('recommendations-container');
        this.initialize();
    }

    async initialize() {
        if (this.recommendationsContainer) {
            await this.loadRecommendations();
        }
    }

    async loadRecommendations() {
        try {
            const response = await fetch('/api/reviews/recommendations', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load recommendations');
            }

            const recommendations = await response.json();
            console.log('Received recommendations:', recommendations);

            if (!recommendations || recommendations.length === 0) {
                this.recommendationsContainer.innerHTML = '<p>No recommendations available yet. Start reviewing books to get personalized recommendations!</p>';
                return;
            }

            const recommendationsHtml = `
                <h3 style="margin-bottom: 20px; color: #2c3e50;">Recommended For You</h3>
                <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                    ${recommendations.map(book => this.createRecommendationElement(book)).join('')}
                </div>
            `;

            this.recommendationsContainer.innerHTML = recommendationsHtml;
        } catch (error) {
            console.error('Error loading recommendations:', error);
            this.recommendationsContainer.innerHTML = '<p>Error loading recommendations. Please try again later.</p>';
        }
    }

    createRecommendationElement(book) {
        const stars = '★'.repeat(Math.round(book.averageRating)) + '☆'.repeat(5 - Math.round(book.averageRating));
        const coverUrl = book.bookCover || 'https://via.placeholder.com/150x200?text=No+Cover';
        
        // Ensure the cover URL uses HTTPS and has the correct format
        let safeCoverUrl = coverUrl;
        if (safeCoverUrl && safeCoverUrl.startsWith('http:')) {
            safeCoverUrl = 'https:' + safeCoverUrl.split(':')[1];
        }

        return `
            <div class="recommendation-card" style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 5px;">
                <div style="display: flex; gap: 15px;">
                    <div style="flex: 0 0 100px;">
                        <img src="${safeCoverUrl}" alt="${book.bookTitle}" style="width: 100%; height: auto; border-radius: 3px;">
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 5px; font-size: 1.1em;">${book.bookTitle || 'Untitled Book'}</div>
                        <div style="color: #555; margin-bottom: 5px;">By ${book.bookAuthor || 'Unknown Author'}</div>
                        ${book.averageRating ? `
                            <div style="color: #f39c12; margin-bottom: 5px;">
                                ${stars} (${book.averageRating.toFixed(1)}${book.reviewCount ? `, ${book.reviewCount} reviews` : ''})
                            </div>
                        ` : ''}
                        ${book.genre ? `<div style="font-size: 0.85em; color: #666; margin-bottom: 5px;">${book.genre}</div>` : ''}
                        ${book.matchReason ? `<div style="font-size: 0.8em; color: #27ae60; margin-bottom: 5px;">${book.matchReason}</div>` : ''}
                        ${book.description ? `<div style="font-size: 0.9em; color: #555; margin-top: 8px;">${book.description}</div>` : ''}
                        ${book.previewLink ? `<a href="${book.previewLink}" target="_blank" style="font-size: 0.85em; color: #3498db; text-decoration: none; display: inline-block; margin-top: 8px;">Preview →</a>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize the review and recommendation systems when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize review system if on a book details page
    if (document.getElementById('reviews-container')) {
        new BookReviewSystem();
    }

    // Initialize recommendation system if on the dashboard
    if (document.getElementById('recommendations-container')) {
        new BookRecommendationSystem();
    }
});
