# Implementation Plan - Hybrid Recommendation System

The user wants recommendations to come from **books uploaded by other users** (Local Inventory) but filtered by **genre and author** of the user's reading history. They also complained about repetition and lack of genre matching.
To support the UI (which needs images), I will enrich the local book data with **Google Books API** metadata (covers).

## Proposed Changes

### 1. Backend Logic
#### [MODIFY] [routes/bookReviewRoutes.js](file:///d:/ReadCycle_New - Copy/ReadCycle/routes/bookReviewRoutes.js)
- **Source**: Fetch all `User` documents (excluding current user).
- **Filtering**: 
    - Extract `preferredGenres` and `preferredAuthors` from current user's `myReads` and `myBooks`.
    - Find books in other users' `myBooks` that match these preferences AND are `status: 'available'`.
- **Enrichment**: 
    - For the matched local books, query Google Books API using `title` and `author` to get `bookCover` and `description`.
- **Variety**: Shuffle the results to prevent "same book again and again".
- **Fallback**: If no matches found, maybe return a few random available books from others (discovery mode).

## Verification Plan
1. Login.
2. Check "My Reads" > "Smart Picks".
3. Verify recommendations are books that exist in the system (you might recognize titles from "Find Books") but have nice covers now.
4. Refresh to see if variety improves (shuffling).
