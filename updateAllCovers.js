/**
 * UNIVERSAL Book Cover Updater
 * Updates ALL books without covers in one go
 * Usage: node updateAllCovers.js
 */

const mongoose = require('mongoose');
const { fetchBookCover } = require('./utils/googleBooksApi');

const userSchema = new mongoose.Schema({
    userid: String,
    fullname: String,
    myBooks: [{
        title: String,
        author: String,
        coverImage: String,
        description: String
    }]
});

const User = mongoose.model('User', userSchema);

async function updateAllCovers() {
    try {
        const mongoURI = "mongodb+srv://HetviK2208:HetviK9909855402@cluster0.ih1tunm.mongodb.net/ReadCycle";
        await mongoose.connect(mongoURI);

        const users = await User.find({});
        let total = 0, updated = 0, failed = 0;

        for (const user of users) {
            if (!user.myBooks || user.myBooks.length === 0) continue;
            let userUpdated = false;

            for (let i = 0; i < user.myBooks.length; i++) {
                const book = user.myBooks[i];
                total++;

                // Skip if already has cover
                if (book.coverImage) {
                    console.log(`✓ ${book.title}`);
                    continue;
                }

                // Try to fetch cover for ANY book without one
                console.log(`🔍 ${book.title}...`);
                try {
                    const data = await fetchBookCover(book.title, book.author || '');

                    if (data.success && data.coverImage) {
                        user.myBooks[i].coverImage = data.coverImage;
                        if (!user.myBooks[i].description && data.description) {
                            user.myBooks[i].description = data.description.substring(0, 500);
                        }
                        console.log(`   ✅ Cover found!`);
                        updated++;
                        userUpdated = true;
                    } else {
                        console.log(`   ⚠️  No cover available`);
                        failed++;
                    }
                } catch (error) {
                    console.log(`   ❌ Error`);
                    failed++;
                }
            }

            if (userUpdated) await user.save();
        }

        console.log(`\n${'='.repeat(40)}`);
        console.log(`Total: ${total} | Updated: ${updated} | Failed: ${failed}`);
        console.log(`${'='.repeat(40)}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Done!');
    }
}

updateAllCovers();
