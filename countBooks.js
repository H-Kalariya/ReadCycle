const mongoose = require('mongoose');
const User = require('./models/User');

async function countBooks() {
  try {
    await mongoose.connect('mongodb://localhost:27017/readcycle', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    let totalBooks = 0;
    let availableBooks = 0;
    
    for (const user of users) {
      const userBooks = user.myBooks || [];
      totalBooks += userBooks.length;
      availableBooks += userBooks.filter(book => book.status === 'available').length;
      
      console.log(`User ${user.fullname || user.email} has ${userBooks.length} books (${userBooks.filter(b => b.status === 'available').length} available)`);
    }
    
    console.log('\nSummary:');
    console.log(`Total users: ${users.length}`);
    console.log(`Total books: ${totalBooks}`);
    console.log(`Available books: ${availableBooks}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

countBooks();
