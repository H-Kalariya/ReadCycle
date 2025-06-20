const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const port = 3019;

// Connect to MongoDB
mongoose.connect("mongodb+srv://HetviK22:HetviK76004@cluster0.wrddkah.mongodb.net/b", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB connection error:", err));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
  secret: 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Enhanced user schema with exchange details
const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  userid: { type: String, unique: true, required: true },
  phone: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  myBooks: [{
    title: { type: String, required: true },
    author: { type: String, required: true },
    isbn: { type: String },
    description: { type: String },
    status: { 
      type: String, 
      enum: ['available', 'borrowed', 'requested'], 
      default: 'available' 
    }
  }],
  bookRequests: [{
    bookId: { type: mongoose.Schema.Types.ObjectId },
    bookTitle: { type: String, required: true },
    bookAuthor: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ownerName: { type: String },
    ownerUserId: { type: String },
    ownerAddress: { type: String },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requesterName: { type: String },
    requesterUserId: { type: String },
    requesterPhone: { type: String },
    requesterAddress: { type: String },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'rejected'], 
      default: 'pending' 
    },
    exchangeAddress: { type: String },
    exchangeTime: { type: Date },
    message: { type: String },
    requestedAt: { type: Date, default: Date.now }
  }]
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("Users", userSchema);

// Function to check for existing user
async function checkExistingUser(userid, phone, email) {
  const existingUser = await User.findOne({
    $or: [
      { userid: userid },
      { phone: phone },
      { email: email }
    ]
  });
  
  if (existingUser) {
    if (existingUser.userid === userid) return 'User ID';
    if (existingUser.phone === phone) return 'Phone number';
    if (existingUser.email === email) return 'Email';
  }
  
  return null;
}

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  next();
};

// Routes

// Serve the main page (login/signup)
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle signup
app.post('/signup', async (req, res) => {
  const { fullname, userid, no, email, address, password, verifyPassword } = req.body;

  // Validate password match
  if (password !== verifyPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  try {
    // Check for existing user before attempting to save
    const duplicateField = await checkExistingUser(userid, no, email);
    if (duplicateField) {
      return res.status(400).json({ 
        error: `${duplicateField} is already registered. Please use a different one.`
      });
    }

    const newUser = new User({
      fullname,
      userid,
      phone: no,
      email,
      address,
      password,
      myBooks: [],
      bookRequests: []
    });

    await newUser.save();

    // Auto-login after successful registration
    req.session.user = {
      id: newUser._id,
      userid: newUser.userid,
      fullname: newUser.fullname,
      email: newUser.email
    };

    res.json({ message: "User registered successfully!", redirect: "/dashboard" });
    
  } catch (error) {
    // Handle MongoDB duplicate key error (fallback)
    if (error.code === 11000) {
      const duplicatedField = Object.keys(error.keyPattern)[0];
      let fieldName = duplicatedField;
      
      // Make field names more user-friendly
      if (duplicatedField === 'phone') fieldName = 'Phone number';
      if (duplicatedField === 'userid') fieldName = 'User ID';
      if (duplicatedField === 'email') fieldName = 'Email';
      
      return res.status(400).json({ 
        error: `${fieldName} is already registered. Please use a different one.`
      });
    }
    
    console.error("❌ Error saving user:", error);
    res.status(500).json({ error: "Server error while registering user." });
  }
});

// Handle login
app.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  try {
    // Find user by email or userid
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { userid: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email/userid or password." });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email/userid or password." });
    }

    // Create session
    req.session.user = {
      id: user._id,
      userid: user.userid,
      fullname: user.fullname,
      email: user.email
    };

    res.json({ message: "Login successful!", redirect: "/dashboard" });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "Server error during login." });
  }
});

// Dashboard route
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('-password');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - ReadCycle</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            color: #333;
          }
          .dashboard {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            padding: 40px;
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.25);
          }
          h1 { color: #4CAF50; margin-bottom: 10px; }
          .user-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          }
          .logout-btn {
            background: #f44336;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            text-decoration: none;
            display: inline-block;
            transition: background 0.3s;
          }
          .logout-btn:hover { background: #d32f2f; }
          .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          .feature-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 2px solid transparent;
            transition: all 0.3s;
          }
          .feature-card:hover {
            border-color: #4CAF50;
            transform: translateY(-5px);
          }
          .feature-card a {
            color: inherit;
            text-decoration: none;
            display: block;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div class="dashboard">
          <h1>Welcome to ReadCycle, ${user.fullname}!</h1>
          <p>Your personalized book sharing dashboard</p>
          
          <div class="user-info">
            <h3>Your Profile</h3>
            <p><strong>Full Name:</strong> ${user.fullname}</p>
            <p><strong>User ID:</strong> ${user.userid}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Phone:</strong> ${user.phone}</p>
            <p><strong>Address:</strong> ${user.address}</p>
            <p><strong>Member since:</strong> ${user.createdAt.toLocaleDateString()}</p>
          </div>
          
          <div class="feature-grid">
            <div class="feature-card">
              <a href="/add-book">
                <h4>➕ Add Book</h4>
                <p>Add a new book to your collection</p>
              </a>
            </div>
            <div class="feature-card">
              <a href="/my-books">
                <h4>📚 My Books</h4>
                <p>Manage your book collection</p>
              </a>
            </div>
            <div class="feature-card">
              <a href="/find-books">
                <h4>🔍 Find Books</h4>
                <p>Discover new books to borrow</p>
              </a>
            </div>
            <div class="feature-card">
              <a href="/requests">
                <h4>📝 Book Requests</h4>
                <p>View pending requests</p>
              </a>
            </div>
          </div>
          
          <a href="/logout" class="logout-btn">Logout</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/dashboard');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// Add Book Page
app.get('/add-book', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Add Book - ReadCycle</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          margin: 0;
          padding: 20px;
          min-height: 100vh;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          padding: 30px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.25);
        }
        h1 {
          color: #4CAF50;
          margin-bottom: 20px;
          text-align: center;
        }
        .back-btn {
          display: inline-block;
          margin-bottom: 20px;
          color: #2575fc;
          text-decoration: none;
          font-weight: bold;
        }
        .back-btn:hover {
          text-decoration: underline;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
        }
        input, textarea {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #ddd;
          font-size: 16px;
        }
        button {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          width: 100%;
          margin-top: 10px;
          transition: background 0.3s;
        }
        button:hover {
          background: #45a049;
        }
        .response-message {
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
          text-align: center;
          display: none;
        }
        .success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="/dashboard" class="back-btn">← Back to Dashboard</a>
        <h1>Add a New Book</h1>
        <form id="add-book-form">
          <div class="form-group">
            <label for="title">Book Title *</label>
            <input type="text" id="title" name="title" required>
          </div>
          <div class="form-group">
            <label for="author">Author *</label>
            <input type="text" id="author" name="author" required>
          </div>
          <div class="form-group">
            <label for="isbn">ISBN (Optional)</label>
            <input type="text" id="isbn" name="isbn">
          </div>
          <div class="form-group">
            <label for="description">Description (Optional)</label>
            <textarea id="description" name="description" rows="3"></textarea>
          </div>
          <button type="submit">Add to My Collection</button>
        </form>
        <div id="response-message" class="response-message"></div>
      </div>
      <script>
        document.getElementById('add-book-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const title = document.getElementById('title').value;
          const author = document.getElementById('author').value;
          const isbn = document.getElementById('isbn').value;
          const description = document.getElementById('description').value;
          
          try {
            const response = await fetch('/add-book', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ title, author, isbn, description })
            });
            
            const result = await response.json();
            const responseEl = document.getElementById('response-message');
            
            if (response.ok) {
              responseEl.textContent = '✅ ' + result.message;
              responseEl.className = 'response-message success';
              responseEl.style.display = 'block';
              
              // Clear form
              document.getElementById('add-book-form').reset();
              
              // Redirect after delay
              setTimeout(() => {
                window.location.href = '/my-books';
              }, 1500);
            } else {
              responseEl.textContent = '❌ ' + result.error;
              responseEl.className = 'response-message error';
              responseEl.style.display = 'block';
            }
          } catch (error) {
            console.error('Error adding book:', error);
            const responseEl = document.getElementById('response-message');
            responseEl.textContent = '❌ An error occurred. Please try again.';
            responseEl.className = 'response-message error';
            responseEl.style.display = 'block';
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Add Book Endpoint
app.post('/add-book', requireAuth, async (req, res) => {
  try {
    const { title, author, isbn, description } = req.body;
    const userId = req.session.user.id;

    const newBook = {
      title,
      author,
      isbn: isbn || '',
      description: description || '',
      status: 'available'
    };

    await User.findByIdAndUpdate(userId, {
      $push: { myBooks: newBook }
    });

    res.json({ message: 'Book added successfully!' });
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

// My Books Page
app.get('/my-books', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('myBooks');
    const books = user.myBooks || [];

    let booksHtml = '';
    if (books.length === 0) {
      booksHtml = `<div class="no-books">
        <p>You haven't added any books yet.</p>
        <a href="/add-book" class="btn">Add Your First Book</a>
      </div>`;
    } else {
      booksHtml = books.map(book => `
        <div class="book-card">
          <div class="book-info">
            <h3>${book.title}</h3>
            <p><strong>Author:</strong> ${book.author}</p>
            ${book.isbn ? `<p><strong>ISBN:</strong> ${book.isbn}</p>` : ''}
            ${book.description ? `<p><strong>Description:</strong> ${book.description}</p>` : ''}
            <div class="status ${book.status}">${book.status.toUpperCase()}</div>
          </div>
          <div class="book-actions">
            ${book.status === 'available' ? 
              `<button class="btn edit-btn" data-id="${book._id}">Edit</button>
               <button class="btn delete-btn" data-id="${book._id}">Remove</button>` : 
              '<span class="action-disabled">Book is currently ' + book.status + '</span>'}
          </div>
        </div>
      `).join('');
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My Books - ReadCycle</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            color: #333;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.25);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          h1 {
            color: #4CAF50;
            margin: 0;
          }
          .back-btn {
            color: #2575fc;
            text-decoration: none;
            font-weight: bold;
          }
          .add-btn {
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            margin: 10px 0;
          }
          .books-container {
            margin-top: 20px;
          }
          .book-card {
            display: flex;
            justify-content: space-between;
            border: 1px solid #eee;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            background: #f8f9fa;
          }
          .book-info {
            flex: 1;
          }
          .book-info h3 {
            margin-top: 0;
          }
          .book-actions {
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 150px;
            gap: 5px;
          }
          .btn {
            padding: 8px 15px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
            font-size: 14px;
          }
          .edit-btn {
            background: #2196F3;
            color: white;
          }
          .delete-btn {
            background: #f44336;
            color: white;
          }
          .no-books {
            text-align: center;
            padding: 40px 0;
          }
          .no-books p {
            margin-bottom: 20px;
            font-size: 18px;
          }
          .no-books .btn {
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
          }
          .status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            margin-top: 10px;
          }
          .available {
            background-color: #d4edda;
            color: #155724;
          }
          .borrowed {
            background-color: #fff3cd;
            color: #856404;
          }
          .requested {
            background-color: #cce5ff;
            color: #004085;
          }
          .action-disabled {
            color: #6c757d;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="/dashboard" class="back-btn">← Back to Dashboard</a>
            <h1>My Books</h1>
          </div>
          
          <a href="/add-book" class="add-btn">+ Add New Book</a>
          
          <div class="books-container">
            ${booksHtml}
          </div>
        </div>
        
        <script>
          // Handle delete button clicks
          document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
              const bookId = this.dataset.id;
              if (confirm('Are you sure you want to remove this book from your collection?')) {
                try {
                  const response = await fetch('/delete-book', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ bookId })
                  });
                  
                  if (response.ok) {
                    location.reload();
                  } else {
                    alert('Failed to delete book. Please try again.');
                  }
                } catch (error) {
                  console.error('Error deleting book:', error);
                  alert('An error occurred. Please try again.');
                }
              }
            });
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error loading my books:', error);
    res.status(500).send('Error loading books');
  }
});

// Delete Book Endpoint
app.post('/delete-book', requireAuth, async (req, res) => {
  try {
    const { bookId } = req.body;
    const userId = req.session.user.id;

    await User.findByIdAndUpdate(userId, {
      $pull: { myBooks: { _id: bookId } }
    });

    res.sendStatus(200);
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Find Books Page
app.get('/find-books', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Find all books from other users that are available
    const users = await User.find({
      _id: { $ne: userId },
      'myBooks.status': 'available'
    }).select('fullname userid myBooks address');
    
    let booksHtml = '';
    
    if (users.length === 0) {
      booksHtml = `<div class="no-books">No books available from other users at the moment.</div>`;
    } else {
      users.forEach(user => {
        user.myBooks.forEach(book => {
          if (book.status === 'available') {
            booksHtml += `
              <div class="book-card">
                <div class="book-info">
                  <h3>${book.title}</h3>
                  <p><strong>Author:</strong> ${book.author}</p>
                  <p><strong>Owner:</strong> ${user.fullname}</p>
                  <p><strong>User ID:</strong> ${user.userid}</p>
                  <p><strong>Address:</strong> ${user.address}</p>
                  ${book.description ? `<p><strong>Description:</strong> ${book.description}</p>` : ''}
                  ${book.isbn ? `<p><strong>ISBN:</strong> ${book.isbn}</p>` : ''}
                </div>
                <div class="book-actions">
                  <button class="btn request-btn" 
                    data-book-id="${book._id}" 
                    data-owner-id="${user._id}"
                    data-book-title="${book.title}"
                    data-book-author="${book.author}"
                    data-owner-name="${user.fullname}"
                    data-owner-userid="${user.userid}"
                    data-owner-address="${user.address}">
                    Request Book
                  </button>
                </div>
              </div>
            `;
          }
        });
      });
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Find Books - ReadCycle</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            color: #333;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.25);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          h1 {
            color: #4CAF50;
            margin: 0;
          }
          .back-btn {
            color: #2575fc;
            text-decoration: none;
            font-weight: bold;
          }
          .books-container {
            margin-top: 20px;
          }
          .book-card {
            display: flex;
            justify-content: space-between;
            border: 1px solid #eee;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            background: #f8f9fa;
          }
          .book-info {
            flex: 1;
          }
          .book-info h3 {
            margin-top: 0;
            color: #2c3e50;
          }
          .book-info p {
            margin: 5px 0;
          }
          .book-actions {
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 150px;
          }
          .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
            font-size: 14px;
            margin: 2px 0;
          }
          .request-btn {
            background: #4CAF50;
            color: white;
          }
          .request-btn:hover {
            background: #45a049;
          }
          .no-books {
            text-align: center;
            padding: 40px 0;
            font-size: 18px;
            color: #666;
          }
          .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
          }
          .modal-content {
            background-color: white;
            margin: 15% auto;
            padding: 20px;
            border-radius: 10px;
            width: 80%;
            max-width: 500px;
          }
          .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
          }
          .close:hover {
            color: black;
          }
          .form-group {
            margin-bottom: 15px;
          }
          .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          .form-group input, .form-group textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
          }
          .form-group textarea {
            height: 80px;
            resize: vertical;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="/dashboard" class="back-btn">← Back to Dashboard</a>
            <h1>Find Books</h1>
          </div>
          
          <div class="books-container">
            ${booksHtml}
          </div>
        </div>

        <!-- Request Modal -->
        <div id="requestModal" class="modal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Request Book</h2>
            <form id="requestForm">
              <div class="form-group">
                <label for="exchangeAddress">Exchange Address:</label>
                <input type="text" id="exchangeAddress" name="exchangeAddress" required>
              </div>
              <div class="form-group">
                <label for="exchangeTime">Preferred Exchange Time:</label>
                <input type="datetime-local" id="exchangeTime" name="exchangeTime" required>
              </div>
              <div class="form-group">
                <label for="message">Message (Optional):</label>
                <textarea id="message" name="message" placeholder="Add a message for the book owner..."></textarea>
              </div>
              <button type="submit" class="btn request-btn">Send Request</button>
            </form>
          </div>
        </div>
        
        <script>
          const modal = document.getElementById('requestModal');
          const span = document.getElementsByClassName('close')[0];
          let currentBookData = {};

          // Open modal when request button is clicked
          document.querySelectorAll('.request-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              currentBookData = {
                bookId: this.dataset.bookId,
                ownerId: this.dataset.ownerId,
                bookTitle: this.dataset.bookTitle,
                bookAuthor: this.dataset.bookAuthor,
                ownerName: this.dataset.ownerName,
                ownerUserId: this.dataset.ownerUserid,
                ownerAddress: this.dataset.ownerAddress
              };
              modal.style.display = 'block';
            });
          });

          // Close modal
          span.onclick = function() {
            modal.style.display = 'none';
          }

          window.onclick = function(event) {
            if (event.target == modal) {
              modal.style.display = 'none';
            }
          }

          // Handle form submission
          document.getElementById('requestForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const requestData = {
              ...currentBookData,
              exchangeAddress: formData.get('exchangeAddress'),
              exchangeTime: formData.get('exchangeTime'),
              message: formData.get('message')
            };

            try {
              const response = await fetch('/request-book', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
              });

              const result = await response.json();

              if (response.ok) {
                alert('✅ Book request sent successfully!');
                modal.style.display = 'none';
                location.reload();
              } else {
                alert('❌ ' + result.error);
              }
            } catch (error) {
              console.error('Error sending request:', error);
              alert('❌ An error occurred. Please try again.');
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error loading find books:', error);
    res.status(500).send('Error loading books');
  }
});

// Request Book Endpoint
app.post('/request-book', requireAuth, async (req, res) => {
  try {
    const { bookId, ownerId, bookTitle, bookAuthor, ownerName, ownerUserId, ownerAddress, exchangeAddress, exchangeTime, message } = req.body;
    const requesterId = req.session.user.id;
    const requesterData = await User.findById(requesterId).select('fullname userid phone address');

    // Create request object
    const bookRequest = {
      bookId,
      bookTitle,
      bookAuthor,
      ownerId,
      ownerName,
      ownerUserId,
      ownerAddress,
      requesterId,
      requesterName: requesterData.fullname,
      requesterUserId: requesterData.userid,
      requesterPhone: requesterData.phone,
      requesterAddress: requesterData.address,
      exchangeAddress,
      exchangeTime: new Date(exchangeTime),
      message: message || '',
      status: 'pending'
    };

    // Add request to both users' bookRequests arrays
    await User.findByIdAndUpdate(ownerId, {
      $push: { bookRequests: bookRequest }
    });

    await User.findByIdAndUpdate(requesterId, {
      $push: { bookRequests: bookRequest }
    });

    // Update book status to 'requested'
    await User.findOneAndUpdate(
      { _id: ownerId, 'myBooks._id': bookId },
      { $set: { 'myBooks.$.status': 'requested' } }
    );

    res.json({ message: 'Book request sent successfully!' });
  } catch (error) {
    console.error('Error sending book request:', error);
    res.status(500).json({ error: 'Failed to send book request' });
  }
});

// Book Requests Page
app.get('/requests', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId).select('bookRequests userid');
    
    const incomingRequests = user.bookRequests.filter(req => 
      req.ownerId.toString() === userId.toString() && req.status === 'pending'
    );
    
    const outgoingRequests = user.bookRequests.filter(req => 
      req.requesterId.toString() === userId.toString()
    );

    let incomingHtml = '';
    let outgoingHtml = '';

    if (incomingRequests.length === 0) {
      incomingHtml = '<p>No pending incoming requests.</p>';
    } else {
      incomingHtml = incomingRequests.map(request => `
        <div class="request-card">
          <div class="request-info">
            <h4>${request.bookTitle} by ${request.bookAuthor}</h4>
            <p><strong>Requested by:</strong> ${request.requesterName} (${request.requesterUserId})</p>
            <p><strong>Phone:</strong> ${request.requesterPhone}</p>
            <p><strong>Requester Address:</strong> ${request.requesterAddress}</p>
            <p><strong>Requested on:</strong> ${new Date(request.requestedAt).toLocaleDateString()}</p>
          </div>
          <div class="request-actions">
            <button class="btn accept-btn" data-request-id="${request._id}">Accept</button>
            <button class="btn reject-btn" data-request-id="${request._id}">Reject</button>
          </div>
        </div>
      `).join('');
    }

    if (outgoingRequests.length === 0) {
      outgoingHtml = '<p>No outgoing requests.</p>';
    } else {
      outgoingHtml = outgoingRequests.map(request => `
        <div class="request-card">
          <div class="request-info">
            <h4>${request.bookTitle} by ${request.bookAuthor}</h4>
            <p><strong>Owner:</strong> ${request.ownerName} (${request.ownerUserId})</p>
            <p><strong>Status:</strong> <span class="status ${request.status}">${request.status.toUpperCase()}</span></p>
            ${request.status === 'accepted' ? `
              <p><strong>Exchange Address:</strong> ${request.exchangeAddress}</p>
              <p><strong>Exchange Time:</strong> ${new Date(request.exchangeTime).toLocaleString()}</p>
            ` : ''}
            ${request.message ? `<p><strong>Your Message:</strong> ${request.message}</p>` : ''}
            <p><strong>Requested on:</strong> ${new Date(request.requestedAt).toLocaleDateString()}</p>
          </div>
        </div>
      `).join('');
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Book Requests - ReadCycle</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            color: #333;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.25);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          h1 {
            color: #4CAF50;
            margin: 0;
          }
          .back-btn {
            color: #2575fc;
            text-decoration: none;
            font-weight: bold;
          }
          .section {
            margin-bottom: 40px;
          }
          .section h2 {
            color: #2c3e50;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
          }
          .request-card {
            display: flex;
            justify-content: space-between;
            border: 1px solid #eee;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            background: #f8f9fa;
          }
          .request-info {
            flex: 1;
          }
          .request-info h4 {
            margin-top: 0;
            color: #2c3e50;
          }
          .request-info p {
            margin: 5px 0;
          }
          .request-actions {
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 120px;
            gap: 10px;
          }
          .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-align: center;
            font-size: 14px;
          }
          .accept-btn {
            background: #4CAF50;
            color: white;
          }
          .reject-btn {
            background: #f44336;
            color: white;
          }
          .status {
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
          }
          .pending {
            background: #fff3cd;
            color: #856404;
          }
          .accepted {
            background: #d4edda;
            color: #155724;
          }
          .rejected {
            background: #f8d7da;
            color: #721c24;
          }
          .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
          }
          .modal-content {
            background-color: white;
            margin: 15% auto;
            padding: 20px;
            border-radius: 10px;
            width: 80%;
            max-width: 500px;
          }
          .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
          }
          .close:hover {
            color: black;
          }
          .form-group {
            margin-bottom: 15px;
          }
          .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          .form-group input, .form-group textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
          }
          .form-group textarea {
            height: 80px;
            resize: vertical;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="/dashboard" class="back-btn">← Back to Dashboard</a>
            <h1>Book Requests</h1>
          </div>
          
          <div class="section">
            <h2>Incoming Requests</h2>
            ${incomingHtml}
          </div>
          
          <div class="section">
            <h2>My Requests</h2>
            ${outgoingHtml}
          </div>
        </div>

        <!-- Exchange Details Modal -->
        <div id="exchangeModal" class="modal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Provide Exchange Details</h2>
            <form id="exchangeForm">
              <input type="hidden" id="requestId" name="requestId">
              <div class="form-group">
                <label for="exchangeAddress">Exchange Address:</label>
                <input type="text" id="exchangeAddress" name="exchangeAddress" required>
              </div>
              <div class="form-group">
                <label for="exchangeTime">Exchange Time:</label>
                <input type="datetime-local" id="exchangeTime" name="exchangeTime" required>
              </div>
              <button type="submit" class="btn accept-btn">Confirm Acceptance</button>
            </form>
          </div>
        </div>
        
        <script>
          const modal = document.getElementById('exchangeModal');
          const span = document.getElementsByClassName('close')[0];
          let currentRequestId = '';

          // Open modal when accept button is clicked
          document.querySelectorAll('.accept-btn').forEach(btn => {
            if (!btn.dataset.requestId) return; // Skip if not an accept button for a request
            
            btn.addEventListener('click', function() {
              currentRequestId = this.dataset.requestId;
              document.getElementById('requestId').value = currentRequestId;
              modal.style.display = 'block';
            });
          });

          // Close modal
          span.onclick = function() {
            modal.style.display = 'none';
          }

          window.onclick = function(event) {
            if (event.target == modal) {
              modal.style.display = 'none';
            }
          }

          // Handle form submission
          document.getElementById('exchangeForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const requestId = document.getElementById('requestId').value;
            const exchangeAddress = document.getElementById('exchangeAddress').value;
            const exchangeTime = document.getElementById('exchangeTime').value;
            
            try {
              const response = await fetch('/accept-request', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                  requestId, 
                  exchangeAddress, 
                  exchangeTime 
                })
              });

              if (response.ok) {
                alert('✅ Request accepted! Exchange details saved.');
                modal.style.display = 'none';
                location.reload();
              } else {
                const result = await response.json();
                alert('❌ ' + result.error);
              }
            } catch (error) {
              console.error('Error accepting request:', error);
              alert('❌ An error occurred. Please try again.');
            }
          });

          // Handle reject buttons
          document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
              const requestId = this.dataset.requestId;
              
              if (confirm("Are you sure you want to reject this request?")) {
                try {
                  const response = await fetch('/reject-request', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ requestId })
                  });
                  
                  if (response.ok) {
                    location.reload();
                  } else {
                    const result = await response.json();
                    alert('Error: ' + result.error);
                  }
                } catch (error) {
                  console.error('Error rejecting request:', error);
                  alert('An error occurred. Please try again.');
                }
              }
            });
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error loading requests:', error);
    res.status(500).send('Error loading requests');
  }
});

// Accept Request with Exchange Details
app.post('/accept-request', requireAuth, async (req, res) => {
  try {
    const { requestId, exchangeAddress, exchangeTime } = req.body;
    const userId = req.session.user.id;

    // Update request in owner's records
    const ownerUpdate = await User.findOneAndUpdate(
      { 
        _id: userId, 
        'bookRequests._id': requestId 
      },
      { 
        $set: { 
          'bookRequests.$.status': 'accepted',
          'bookRequests.$.exchangeAddress': exchangeAddress,
          'bookRequests.$.exchangeTime': new Date(exchangeTime)
        } 
      },
      { new: true }
    );

    if (!ownerUpdate) {
      return res.status(404).json({ error: 'Request not found for owner' });
    }

    // Find the request to get requester details
    const request = ownerUpdate.bookRequests.find(req => req._id.toString() === requestId);
    
    // Update request in requester's records
    await User.findOneAndUpdate(
      { 
        _id: request.requesterId, 
        'bookRequests._id': requestId 
      },
      { 
        $set: { 
          'bookRequests.$.status': 'accepted',
          'bookRequests.$.exchangeAddress': exchangeAddress,
          'bookRequests.$.exchangeTime': new Date(exchangeTime)
        } 
      }
    );

    // Update book status to 'borrowed'
    await User.findOneAndUpdate(
      { _id: userId, 'myBooks._id': request.bookId },
      { $set: { 'myBooks.$.status': 'borrowed' } }
    );

    res.json({ message: 'Request accepted successfully!' });
  } catch (error) {
    console.error('Error accepting request:', error);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// Reject Request
app.post('/reject-request', requireAuth, async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.session.user.id;

    // Update request in owner's records
    const ownerUpdate = await User.findOneAndUpdate(
      { 
        _id: userId, 
        'bookRequests._id': requestId 
      },
      { 
        $set: { 
          'bookRequests.$.status': 'rejected'
        } 
      },
      { new: true }
    );

    if (!ownerUpdate) {
      return res.status(404).json({ error: 'Request not found for owner' });
    }

    // Find the request to get requester details
    const request = ownerUpdate.bookRequests.find(req => req._id.toString() === requestId);
    
    // Update request in requester's records
    await User.findOneAndUpdate(
      { 
        _id: request.requesterId, 
        'bookRequests._id': requestId 
      },
      { 
        $set: { 
          'bookRequests.$.status': 'rejected'
        } 
      }
    );

    // Update book status back to 'available'
    await User.findOneAndUpdate(
      { _id: userId, 'myBooks._id': request.bookId },
      { $set: { 'myBooks.$.status': 'available' } }
    );

    res.json({ message: 'Request rejected successfully!' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Start server
app.listen(port, () => {
  console.log("🚀 ReadCycle server running on http://localhost:" + port);
  console.log("📚 Ready to connect book lovers!");
});
