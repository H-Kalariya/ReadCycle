const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userid: String,
    fullname: String,
    myBooks: [{ title: String, author: String, coverImage: String, addedAt: Date }]
});

const User = mongoose.model('User', userSchema);

async function checkLastBook() {
    try {
        const mongoURI = "mongodb+srv://HetviK2208:HetviK9909855402@cluster0.ih1tunm.mongodb.net/ReadCycle";
        await mongoose.connect(mongoURI);

        const users = await User.find({});

        console.log('LAST ADDED BOOKS:\n');

        for (const user of users) {
            if (!user.myBooks || user.myBooks.length === 0) continue;

            // Get last 3 books sorted by addedAt
            const lastBooks = user.myBooks
                .sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0))
                .slice(0, 3);

            console.log(`\n${user.fullname}:`);
            lastBooks.forEach((book, idx) => {
                console.log(`  ${idx + 1}. "${book.title}" by ${book.author}`);
                console.log(`     Cover: ${book.coverImage ? '✅ ' + book.coverImage.substring(0, 50) + '...' : '❌ MISSING'}`);
                console.log(`     Added: ${book.addedAt || 'Unknown'}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

checkLastBook();
