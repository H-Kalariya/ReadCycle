# Walkthrough - Recommendation System Update

I have moved the recommendation system to the "My Reads" page under the "Smart Picks" tab. It fetches books from the Google Books API based on the user's "My Reads" history and "My Books" inventory.

## Changes

### 1. Recommendations API
- **Route**: `/api/reviews/recommendations`
- **Logic**: 
    - Fetches the user's reading preferences (genres, authors) from "My Reads" and "My Books".
    - Searches the **local ReadCycle inventory** (books uploaded by other users) for matches.
    - Scores matches based on genre and author relevance.
    - Enriches the selected local books with **cover images and ratings from Google Books API**.
    - Ensures variety by shuffling and filtering out books the user already knows.

### 2. Frontend
- Updated `public/js/reviews.js` to call the `/api/reviews/recommendations` endpoint.
- Updated `index.js` to:
    - Include a "Smart Picks" tab in the `/my-reads` page.
    - Remove recommendation logic from the Dashboard.
    - Extract `User` model to `models/User.js` for better code organization.

### 3. Middleware & Configuration
- Created `middleware/auth.js` to handle authentication for the new routes.
- Updated `index.js` to mount the `bookReviewRoutes`.

## Verification Results

### Server Status
- The server is running on port **3019**.
- MongoDB connection is successful.

### How to Test
1.  **Log in** to the application.
2.  Go to the **My Reads** page (via Dashboard > My Reads).
3.  Click on the **Smart Picks** tab.
4.  You should see books that are **available for request** from other users, but displayed with nice covers fetched from Google Books.
5.  Refreshing the page should show different results (if there is enough inventory).
