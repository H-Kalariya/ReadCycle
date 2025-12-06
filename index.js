const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const axios = require('axios');
const session = require('express-session');
const cors = require('cors');
const BookReview = require('./models/BookReview');

const app = express();
const port = process.env.PORT || 3020;

// Set trust proxy if in production (needed for correct session/cookie handling behind proxies)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://HetviK2208:HetviK9909855402@cluster0.ih1tunm.mongodb.net/ReadCycle";
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB connection error:", err));

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware with secure configuration for production
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  },
  // IMPORTANT: For production, use a persistent session store like connect-mongo or connect-redis
  store: new session.MemoryStore()
}));

// Enhanced user schema with requestedBooks field
const User = require('./models/User');

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
const bookReviewRoutes = require('./routes/bookReviewRoutes');
app.use('/api/reviews', bookReviewRoutes);

// Serve the main page (login/signup)
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle signup with enhanced validation
app.post('/signup', async (req, res) => {
  const { fullname, userid, no, email, address, password, verifyPassword } = req.body;

  // Validate required fields
  if (!fullname || !userid || !no || !email || !address || !password || !verifyPassword) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  // Validate phone number format (accepts various formats)
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = no.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parentheses
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({ error: "Please enter a valid phone number." });
  }

  // Validate password match
  if (password !== verifyPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  // Validate user ID format (alphanumeric, 3-20 characters)
  const useridRegex = /^[a-zA-Z0-9]{3,20}$/;
  if (!useridRegex.test(userid)) {
    return res.status(400).json({ error: "User ID must be 3-20 characters long and contain only letters and numbers." });
  }

  // Validate full name (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']{2,50}$/;
  if (!nameRegex.test(fullname.trim())) {
    return res.status(400).json({ error: "Please enter a valid full name (2-50 characters, letters only)." });
  }

  try {
    // Check for existing user before attempting to save
    const duplicateField = await checkExistingUser(userid, cleanPhone, email);
    if (duplicateField) {
      return res.status(400).json({
        error: `${duplicateField} is already registered. Please use a different one.`
      });
    }

    const newUser = new User({
      fullname: fullname.trim(),
      userid,
      phone: cleanPhone,
      email: email.toLowerCase().trim(),
      address: address.trim(),
      password,
      credits: 20,
      myBooks: [],
      requestedBooks: [],
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

      if (duplicatedField === 'phone') fieldName = 'Phone number';
      if (duplicatedField === 'userid') fieldName = 'User ID';
      if (duplicatedField === 'email') fieldName = 'Email';

      return res.status(400).json({
        error: `${fieldName} is already registered. Please use a different one.`
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }

    console.error("❌ Error saving user:", error);
    res.status(500).json({ error: "Server error while registering user." });
  }
});

// Handle login with enhanced validation
app.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  // Validate input
  if (!identifier || !password) {
    return res.status(400).json({ error: "Email/user ID and password are required." });
  }

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

    // Handle specific errors
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid input format." });
    }

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
            <p><strong>Credits:</strong> ${user.credits}</p>
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
              <a href="/my-reads">
                <h4>📖 My Reads</h4>
                <p>Log reads & get ideas</p>
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
            <label for="genre">Genre (Optional)</label>
            <select id="genre" name="genre">
              <option value="">Select genre...</option>
              <option value="Fiction">Fiction</option>
              <option value="Non-Fiction">Non-Fiction</option>
              <option value="Science Fiction">Science Fiction</option>
              <option value="Fantasy">Fantasy</option>
              <option value="Mystery">Mystery</option>
              <option value="Thriller">Thriller</option>
              <option value="Romance">Romance</option>
              <option value="Historical Fiction">Historical Fiction</option>
              <option value="Biography">Biography</option>
              <option value="Autobiography">Autobiography</option>
              <option value="Memoir">Memoir</option>
              <option value="Science">Science</option>
              <option value="Technology">Technology</option>
              <option value="History">History</option>
              <option value="Philosophy">Philosophy</option>
              <option value="Psychology">Psychology</option>
              <option value="Self-Help">Self-Help</option>
              <option value="Business">Business</option>
              <option value="Economics">Economics</option>
              <option value="Politics">Politics</option>
              <option value="Religion">Religion</option>
              <option value="Travel">Travel</option>
              <option value="Cooking">Cooking</option>
              <option value="Health">Health</option>
              <option value="Fitness">Fitness</option>
              <option value="Art">Art</option>
              <option value="Music">Music</option>
              <option value="Poetry">Poetry</option>
              <option value="Drama">Drama</option>
              <option value="Comics">Comics</option>
              <option value="Graphic Novel">Graphic Novel</option>
              <option value="Children">Children</option>
              <option value="Young Adult">Young Adult</option>
              <option value="Academic">Academic</option>
              <option value="Textbook">Textbook</option>
              <option value="Reference">Reference</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="condition">Condition (Optional)</label>
            <select id="condition" name="condition">
              <option value="">Select condition...</option>
              <option value="Like New">Like New</option>
              <option value="Very Good">Very Good</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
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
          const genre = document.getElementById('genre').value;
          const condition = document.getElementById('condition').value;
          const isbn = document.getElementById('isbn').value;
          const description = document.getElementById('description').value;
          
          try {
            const response = await fetch('/add-book', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ title, author, genre, condition, isbn, description })
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
    const { title, author, genre, condition, isbn, description } = req.body;
    const userId = req.session.user.id;

    const newBook = {
      _id: new mongoose.Types.ObjectId(),
      title,
      author,
      genre: genre || '',
      condition: condition || '',
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
            ${book.genre ? `<p><strong>Genre:</strong> ${book.genre}</p>` : ''}
            ${book.condition ? `<p><strong>Condition:</strong> ${book.condition}</p>` : ''}
            ${book.isbn ? `<p><strong>ISBN:</strong> ${book.isbn}</p>` : ''}
            ${book.description ? `<p><strong>Description:</strong> ${book.description}</p>` : ''}
            <div class="status ${book.status}">${book.status.toUpperCase()}</div>
          </div>
          <div class="book-actions">
            ${book.status === 'available' ?
          `<button class="btn edit-btn" data-id="${book._id}">Edit</button>
               <button class="btn delete-btn" data-id="${book._id}">Remove</button>` :
          book.status === 'borrowed' ?
            `<button class="btn mark-available-btn" data-id="${book._id}">Mark as Available</button>` :
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
          .mark-available-btn {
            background: #4CAF50;
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

          // Handle mark as available button clicks
          document.querySelectorAll('.mark-available-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
              const bookId = this.dataset.id;
              if (confirm('Mark this book as available for borrowing?')) {
                try {
                  const response = await fetch('/mark-available', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ bookId })
                  });
                  
                  if (response.ok) {
                    location.reload();
                  } else {
                    const result = await response.json();
                    alert('Failed to mark book as available: ' + result.error);
                  }
                } catch (error) {
                  console.error('Error marking book as available:', error);
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
    res.status(500).send('Failed to load my books page');
  }
});

// Find Books Page
app.get('/find-books', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Get search and filter parameters from query string
    const {
      search,
      genre,
      author,
      location,
      condition,
      availability,
      sort
    } = req.query;

    // Build the base query
    let query = {
      _id: { $ne: userId }
    };

    // Build a single $elemMatch for all book filters
    let bookElemMatch = { status: 'available' };
    let hasBookFilter = false;

    // Add search filter (searches in title, author, and description)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      bookElemMatch.$or = [
        { title: searchRegex },
        { author: searchRegex },
        { description: searchRegex }
      ];
      hasBookFilter = true;
    }

    // Add genre filter
    if (genre && genre.trim()) {
      bookElemMatch.genre = new RegExp(genre.trim(), 'i');
      hasBookFilter = true;
    }

    // Add author filter
    if (author && author.trim()) {
      bookElemMatch.author = new RegExp(author.trim(), 'i');
      hasBookFilter = true;
    }

    // Add condition filter
    if (condition && condition.trim()) {
      bookElemMatch.condition = new RegExp(condition.trim(), 'i');
      hasBookFilter = true;
    }

    // Add availability filter (though all books shown are available, this could be for future use)
    if (availability && availability !== 'all') {
      bookElemMatch.status = availability;
      hasBookFilter = true;
    }

    // Only add $elemMatch if any book filter is set
    if (hasBookFilter) {
      query.myBooks = { $elemMatch: bookElemMatch };
    } else {
      // If no book filter, just require at least one available book
      query['myBooks.status'] = 'available';
    }

    // Add location filter (searches in user's address)
    if (location && location.trim()) {
      query.address = new RegExp(location.trim(), 'i');
    }

    // Find all books from other users that match the filters
    const users = await User.find(query).select('fullname userid myBooks address _id requestedBooks');

    // Collect all books and flatten the structure for sorting
    let allBooks = [];
    users.forEach(user => {
      user.myBooks.forEach(book => {
        if (book.status === 'available') {
          // Count pending requests for this book
          const pendingRequestsCount = user.requestedBooks.filter(req =>
            req.bookId.equals(book._id) && req.status === 'pending'
          ).length;

          // Skip books with missing critical information
          if (!book._id || !user._id || !book.title || !book.author || !user.fullname || !user.userid) {
            console.warn('Skipping book with missing data:', book);
            return;
          }

          allBooks.push({
            ...book.toObject(),
            owner: {
              _id: user._id,
              fullname: user.fullname,
              userid: user.userid,
              address: user.address || 'Address not available'
            },
            pendingRequestsCount
          });
        }
      });
    });

    // Apply sorting
    if (sort) {
      allBooks.sort((a, b) => {
        switch (sort) {
          case 'title':
            return a.title.localeCompare(b.title);
          case 'title-desc':
            return b.title.localeCompare(a.title);
          case 'author':
            return a.author.localeCompare(b.author);
          case 'author-desc':
            return b.author.localeCompare(a.author);
          case 'genre':
            return (a.genre || '').toLowerCase().localeCompare((b.genre || '').toLowerCase());
          case 'genre-desc':
            return (b.genre || '').toLowerCase().localeCompare((a.genre || '').toLowerCase());
          case 'location':
            return (a.owner.address || '').localeCompare(b.owner.address || '');
          case 'location-desc':
            return (b.owner.address || '').localeCompare(a.owner.address || '');
          case 'newest':
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          case 'oldest':
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
          default:
            return 0;
        }
      });
    }

    let booksHtml = '';

    if (allBooks.length === 0) {
      booksHtml = '<div class="no-books">No books found matching your search criteria.</div>';
    } else {
      allBooks.forEach(book => {
        const addressValue = book.owner.address;

        booksHtml += `
          <div class="book-card">
            <div class="book-info">
              <h3>${book.title}</h3>
              <p><strong>Author:</strong> ${book.author}</p>
              ${book.genre ? `<p><strong>Genre:</strong> ${book.genre}</p>` : ''}
              ${book.condition ? `<p><strong>Condition:</strong> ${book.condition}</p>` : ''}
              <p><strong>Owner:</strong> ${book.owner.fullname}</p>
              <p><strong>User ID:</strong> ${book.owner.userid}</p>
              <p><strong>Location:</strong> ${addressValue}</p>
              ${book.pendingRequestsCount > 0 ? `<p><strong>Pending Requests:</strong> <span class="pending-count">${book.pendingRequestsCount}</span></p>` : ''}
              ${book.description ? `<p><strong>Description:</strong> ${book.description}</p>` : ''}
              ${book.isbn ? `<p><strong>ISBN:</strong> ${book.isbn}</p>` : ''}
            </div>
            <div class="book-actions">
              <a href="/book/${book._id.toString()}" class="btn" style="background-color: #4CAF50; margin-right: 10px;">
                View Details & Reviews
              </a>
              <button class="btn request-btn" 
                data-book-id="${book._id.toString()}"
                data-owner-id="${book.owner._id.toString()}"
                data-book-title="${book.title}"
                data-book-author="${book.author}"
                data-owner-name="${book.owner.fullname}"
                data-owner-userid="${book.owner.userid}"
                data-owner-address="${addressValue}">
                Request Book
              </button>
            </div>
          </div>
        `;
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
          .search-filter-section {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid #e9ecef;
          }
          .search-row {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
          }
          .search-group {
            flex: 1;
          }
          .search-input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
          }
          .search-input:focus {
            outline: none;
            border-color: #4CAF50;
          }
          .search-btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
          }
          .search-btn:hover {
            background: #45a049;
          }
          .filter-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 15px;
          }
          .filter-group {
            display: flex;
            flex-direction: column;
          }
          .filter-group label {
            font-weight: 600;
            margin-bottom: 5px;
            color: #333;
            font-size: 14px;
          }
          .filter-input, .filter-select {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s;
          }
          .filter-input:focus, .filter-select:focus {
            outline: none;
            border-color: #4CAF50;
          }
          .filter-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
          }
          .filter-btn {
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
          }
          .filter-btn:hover {
            background: #1976D2;
          }
          .clear-btn {
            background: #6c757d;
            color: white;
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            transition: background 0.3s;
          }
          .clear-btn:hover {
            background: #5a6268;
          }
          .active-filters {
            background: #e3f2fd;
            border: 1px solid #2196F3;
            border-radius: 6px;
            padding: 10px 15px;
            margin-bottom: 15px;
            font-size: 14px;
            color: #1976D2;
          }
          .active-filters .clear-all {
            color: #f44336;
            text-decoration: none;
            margin-left: 10px;
            font-weight: bold;
          }
          .active-filters .clear-all:hover {
            text-decoration: underline;
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
          .pending-count {
            background: #ff9800;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
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
          .form-group textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
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

          <!-- Search and Filter Form -->
          <div class="search-filter-section">
            <form id="searchFilterForm" method="GET" action="/find-books">
              <div class="search-row">
                <div class="search-group">
                  <input type="text" name="search" placeholder="Search books, authors, or descriptions..."
                    value="${search || ''}" class="search-input">
                </div>
                <button type="submit" class="search-btn">🔍 Search</button>
              </div>

              <div class="filter-row">
                <div class="filter-group">
                  <label for="genre">Genre:</label>
                  <select name="genre" class="filter-select">
                    <option value="">All Genres</option>
                    <option value="Fiction" ${genre === 'Fiction' ? 'selected' : ''}>Fiction</option>
                    <option value="Non-Fiction" ${genre === 'Non-Fiction' ? 'selected' : ''}>Non-Fiction</option>
                    <option value="Science Fiction" ${genre === 'Science Fiction' ? 'selected' : ''}>Science Fiction</option>
                    <option value="Fantasy" ${genre === 'Fantasy' ? 'selected' : ''}>Fantasy</option>
                    <option value="Mystery" ${genre === 'Mystery' ? 'selected' : ''}>Mystery</option>
                    <option value="Thriller" ${genre === 'Thriller' ? 'selected' : ''}>Thriller</option>
                    <option value="Romance" ${genre === 'Romance' ? 'selected' : ''}>Romance</option>
                    <option value="Historical Fiction" ${genre === 'Historical Fiction' ? 'selected' : ''}>Historical Fiction</option>
                    <option value="Biography" ${genre === 'Biography' ? 'selected' : ''}>Biography</option>
                    <option value="Autobiography" ${genre === 'Autobiography' ? 'selected' : ''}>Autobiography</option>
                    <option value="Memoir" ${genre === 'Memoir' ? 'selected' : ''}>Memoir</option>
                    <option value="Science" ${genre === 'Science' ? 'selected' : ''}>Science</option>
                    <option value="Technology" ${genre === 'Technology' ? 'selected' : ''}>Technology</option>
                    <option value="History" ${genre === 'History' ? 'selected' : ''}>History</option>
                    <option value="Philosophy" ${genre === 'Philosophy' ? 'selected' : ''}>Philosophy</option>
                    <option value="Psychology" ${genre === 'Psychology' ? 'selected' : ''}>Psychology</option>
                    <option value="Self-Help" ${genre === 'Self-Help' ? 'selected' : ''}>Self-Help</option>
                    <option value="Business" ${genre === 'Business' ? 'selected' : ''}>Business</option>
                    <option value="Economics" ${genre === 'Economics' ? 'selected' : ''}>Economics</option>
                    <option value="Politics" ${genre === 'Politics' ? 'selected' : ''}>Politics</option>
                    <option value="Religion" ${genre === 'Religion' ? 'selected' : ''}>Religion</option>
                    <option value="Travel" ${genre === 'Travel' ? 'selected' : ''}>Travel</option>
                    <option value="Cooking" ${genre === 'Cooking' ? 'selected' : ''}>Cooking</option>
                    <option value="Health" ${genre === 'Health' ? 'selected' : ''}>Health</option>
                    <option value="Fitness" ${genre === 'Fitness' ? 'selected' : ''}>Fitness</option>
                    <option value="Art" ${genre === 'Art' ? 'selected' : ''}>Art</option>
                    <option value="Music" ${genre === 'Music' ? 'selected' : ''}>Music</option>
                    <option value="Poetry" ${genre === 'Poetry' ? 'selected' : ''}>Poetry</option>
                    <option value="Drama" ${genre === 'Drama' ? 'selected' : ''}>Drama</option>
                    <option value="Comics" ${genre === 'Comics' ? 'selected' : ''}>Comics</option>
                    <option value="Graphic Novel" ${genre === 'Graphic Novel' ? 'selected' : ''}>Graphic Novel</option>
                    <option value="Children" ${genre === 'Children' ? 'selected' : ''}>Children</option>
                    <option value="Young Adult" ${genre === 'Young Adult' ? 'selected' : ''}>Young Adult</option>
                    <option value="Academic" ${genre === 'Academic' ? 'selected' : ''}>Academic</option>
                    <option value="Textbook" ${genre === 'Textbook' ? 'selected' : ''}>Textbook</option>
                    <option value="Reference" ${genre === 'Reference' ? 'selected' : ''}>Reference</option>
                    <option value="Other" ${genre === 'Other' ? 'selected' : ''}>Other</option>
                  </select>
                </div>

                <div class="filter-group">
                  <label for="author">Author:</label>
                  <input type="text" name="author" placeholder="e.g., John Doe"
                    value="${author || ''}" class="filter-input">
                </div>

                <div class="filter-group">
                  <label for="location">Location:</label>
                  <input type="text" name="location" placeholder="e.g., Downtown, North Side"
                    value="${location || ''}" class="filter-input">
                </div>

                <div class="filter-group">
                  <label for="condition">Condition:</label>
                  <input type="text" name="condition" placeholder="e.g., Like new, Good"
                    value="${condition || ''}" class="filter-input">
                </div>
              </div>

              <div class="filter-actions">
                <button type="submit" class="filter-btn">Apply Filters</button>
                <a href="/find-books" class="clear-btn">Clear All</a>
              </div>
            </form>
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
          let currentBookData = { };

          // Search and filter functionality
          const searchForm = document.getElementById('searchFilterForm');
          const searchInput = document.querySelector('input[name="search"]');

          // Auto-submit form when search input changes (with debounce)
          let searchTimeout;
          searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
              if (this.value.length >= 2 || this.value.length === 0) {
                searchForm.submit();
              }
            }, 500);
          });

          // Show active filters
          function showActiveFilters() {
            const urlParams = new URLSearchParams(window.location.search);
            const activeFilters = [];

            if (urlParams.get('search')) activeFilters.push('Search: "' + urlParams.get('search') + '"');
            if (urlParams.get('genre')) activeFilters.push('Genre: "' + urlParams.get('genre') + '"');
            if (urlParams.get('author')) activeFilters.push('Author: "' + urlParams.get('author') + '"');
            if (urlParams.get('location')) activeFilters.push('Location: "' + urlParams.get('location') + '"');
            if (urlParams.get('condition')) activeFilters.push('Condition: "' + urlParams.get('condition') + '"');
            if (urlParams.get('availability') && urlParams.get('availability') !== 'all') {
              activeFilters.push('Availability: "' + urlParams.get('availability') + '"');
            }
            if (urlParams.get('sort')) {
              const sortLabels = {
                'title': 'Title (A-Z)',
                'title-desc': 'Title (Z-A)',
                'author': 'Author (A-Z)',
                'author-desc': 'Author (Z-A)',
                'genre': 'Genre (A-Z)',
                'genre-desc': 'Genre (Z-A)',
                'location': 'Location (A-Z)',
                'location-desc': 'Location (Z-A)',
                'newest': 'Newest First',
                'oldest': 'Oldest First'
              };
              activeFilters.push('Sort: "' + (sortLabels[urlParams.get('sort')] || urlParams.get('sort')) + '"');
            }
            
            if (activeFilters.length > 0) {
              const filterDisplay = document.createElement('div');
              filterDisplay.className = 'active-filters';
              filterDisplay.innerHTML =
                '<strong>Active Filters:</strong> ' + activeFilters.join(', ') +
                '<a href="/find-books" class="clear-all">Clear All</a>';
              searchForm.parentNode.insertBefore(filterDisplay, searchForm.nextSibling);
            }
          }

          // Initialize active filters display
          showActiveFilters();

          // Update event delegation to handle dynamically added content
          document.body.addEventListener('click', function(e) {
            if (e.target.classList.contains('request-btn')) {
              const btn = e.target;

              // Verify all required attributes
              const requiredAttrs = [
                'bookId', 'ownerId', 'bookTitle', 'bookAuthor',
                'ownerName', 'ownerUserid'
              ];
              
              const missingAttrs = requiredAttrs.filter(attr => {
                const value = btn.dataset[attr];
                return !value || value.trim() === '';
              });
              
              if (missingAttrs.length > 0) {
                console.error("Missing attributes in button:", missingAttrs, "Dataset:", btn.dataset);
                alert('Cannot request this book: Missing information. Please report this issue.');
                return;
              }

              currentBookData = {
                bookId: btn.dataset.bookId,
                ownerId: btn.dataset.ownerId,
                bookTitle: btn.dataset.bookTitle,
                bookAuthor: btn.dataset.bookAuthor,
                ownerName: btn.dataset.ownerName,
                ownerUserId: btn.dataset.ownerUserid,
                ownerAddress: btn.dataset.ownerAddress
              };

              modal.style.display = 'block';
            }
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

            // Check if we have valid book data
            if (!currentBookData || !currentBookData.bookId || !currentBookData.ownerId) {
              alert("Book information is missing. Please refresh the page and try again.");
              return;
            }

            const formData = new FormData(this);
            const requestData = {
              ...currentBookData,
              message: formData.get('message') || ''
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
      </html>`);
  } catch (error) {
    console.error('Error loading find books:', error);
    res.status(500).send('Error loading books');
  }
});

// Helper function for parsing IDs
const parseId = (id) => {
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  if (id instanceof mongoose.Types.ObjectId) {
    return id;
  }
  throw new Error(`Invalid ID format: ${id}`);
};

// Request Book Endpoint - Fixed with proper request creation
app.post('/request-book', requireAuth, async (req, res) => {
  try {
    const { bookId, ownerId, bookTitle, bookAuthor, ownerName, ownerUserId, ownerAddress, message } = req.body;
    const requesterId = req.session.user.id;

    console.log(`[REQUEST] Requester: ${requesterId}, Owner: ${ownerId}, Book: ${bookId}`);

    // Check if requester has enough credits
    const requester = await User.findById(requesterId);
    if (requester.credits < 10) { // Changed to 10 credits
      return res.status(400).json({ error: 'You need at least 10 credits to request a book' });
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(bookId) ||
      !mongoose.Types.ObjectId.isValid(ownerId)) {
      console.error("Invalid ID format - Book:", bookId, "Owner:", ownerId);
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const ownerIdObj = new mongoose.Types.ObjectId(ownerId);
    const bookIdObj = new mongoose.Types.ObjectId(bookId);
    const requesterIdObj = new mongoose.Types.ObjectId(requesterId);

    // Get requester details
    const requesterData = await User.findById(requesterIdObj).select('fullname userid phone address');
    if (!requesterData) {
      console.error("Requester not found:", requesterId);
      return res.status(404).json({ error: 'Requester not found' });
    }

    // Check if requester already has a pending request for this book
    const existingPendingRequest = await User.findOne({
      _id: requesterIdObj,
      'bookRequests.bookId': bookIdObj,
      'bookRequests.status': 'pending'
    });

    if (existingPendingRequest) {
      return res.status(400).json({ error: 'You already have a pending request for this book' });
    }

    // Verify book availability
    const owner = await User.findOne({
      _id: ownerIdObj,
      'myBooks._id': bookIdObj,
      'myBooks.status': 'available'
    });

    if (!owner) {
      console.error("Book unavailable - Owner:", ownerId, "Book:", bookId);

      // Check if book exists at all
      const bookExists = await User.findOne({
        _id: ownerIdObj,
        'myBooks._id': bookIdObj
      });

      if (bookExists) {
        const book = bookExists.myBooks.find(b => b._id.equals(bookIdObj));
        console.error("Book status:", book ? book.status : 'not found');
        return res.status(400).json({
          error: `Book is no longer available (status: ${book?.status || 'unknown'})`
        });
      }

      return res.status(404).json({ error: 'Book not found' });
    }

    // Create request with shared ID
    const requestId = new mongoose.Types.ObjectId();
    const requestedAt = new Date();

    // Create request objects
    const ownerRequest = {
      _id: requestId,
      bookId: bookIdObj,
      bookTitle,
      bookAuthor,
      requesterId: requesterIdObj,
      requesterName: requesterData.fullname,
      requesterUserId: requesterData.userid,
      requesterPhone: requesterData.phone,
      requesterAddress: requesterData.address,
      status: 'pending',
      message: message || '',
      requestedAt
    };

    const requesterRequest = {
      _id: requestId,
      bookId: bookIdObj,
      bookTitle,
      bookAuthor,
      ownerId: ownerIdObj,
      ownerName,
      ownerUserId,
      ownerAddress,
      status: 'pending',
      message: message || '',
      requestedAt
    };

    // Transaction to update both users
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log("Updating owner's requestedBooks...");
      await User.updateOne(
        { _id: ownerIdObj },
        { $push: { requestedBooks: ownerRequest } },
        { session }
      );

      console.log("Updating requester's bookRequests...");
      await User.updateOne(
        { _id: requesterIdObj },
        { $push: { bookRequests: requesterRequest } },
        { session }
      );

      // Keep book status as 'available' so others can still request it
      // Book status will only change to 'borrowed' when owner accepts a request
      console.log("Book remains available for other requests...");

      await session.commitTransaction();
      console.log("Request created successfully!");
      res.json({ message: 'Book request sent successfully!' });
    } catch (error) {
      await session.abortTransaction();
      console.error("Transaction error:", error);
      res.status(500).json({ error: 'Failed to create request' });
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Request creation error:', error);
    res.status(500).json({ error: 'Failed to send book request' });
  }
});

// Book Requests Page - UPDATED with corrected logic
app.get('/requests', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId).select('requestedBooks bookRequests userid fullname');

    // Incoming requests
    const incomingRequests = user.requestedBooks.filter(req => req.status === 'pending');

    // Outgoing requests
    const outgoingRequests = user.bookRequests;

    let incomingHtml = '';
    let outgoingHtml = '';

    if (incomingRequests.length === 0) {
      incomingHtml = '<p>No pending incoming requests.</p>';
    } else {
      incomingRequests.forEach(request => {
        incomingHtml += `
          <div class="request-card">
            <div class="request-info">
              <h4>${request.bookTitle} by ${request.bookAuthor}</h4>
              <p><strong>Requested by:</strong> ${request.requesterName} (${request.requesterUserId})</p>
              <p><strong>Phone:</strong> ${request.requesterPhone}</p>
              <p><strong>Address:</strong> ${request.requesterAddress}</p>
              ${request.message ? `<p><strong>Message:</strong> ${request.message}</p>` : ''}
              <p><strong>Requested on:</strong> ${new Date(request.requestedAt).toLocaleString()}</p>
            </div>
            <div class="request-actions">
              <button class="btn accept-btn" data-request-id="${request._id}">Accept</button>
              <button class="btn reject-btn" data-request-id="${request._id}">Reject</button>
            </div>
          </div>
        `;
      });
    }

    if (outgoingRequests.length === 0) {
      outgoingHtml = '<p>No outgoing requests.</p>';
    } else {
      outgoingRequests.forEach(request => {
        outgoingHtml += `
          <div class="request-card">
            <div class="request-info">
              <h4>${request.bookTitle} by ${request.bookAuthor}</h4>
              <p><strong>Owner:</strong> ${request.ownerName} (${request.ownerUserId})</p>
              <p><strong>Status:</strong> <span class="status ${request.status}">${request.status.toUpperCase()}</span></p>
              ${request.status === 'accepted' && request.exchangeAddress ? `
                <p><strong>Exchange Address:</strong> ${request.exchangeAddress}</p>
                <p><strong>Exchange Time:</strong> ${new Date(request.exchangeTime).toLocaleString()}</p>
              ` : ''}
              ${request.message ? `<p><strong>Your Message:</strong> ${request.message}</p>` : ''}
              <p><strong>Requested on:</strong> ${new Date(request.requestedAt).toLocaleString()}</p>
            </div>
          </div>
        `;
      });
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
              <h2>Incoming Requests (${incomingRequests.length})</h2>
              ${incomingHtml}
            </div>

            <div class="section">
              <h2>My Requests (${outgoingRequests.length})</h2>
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
              btn.addEventListener('click', async function () {
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

// Accept Request Endpoint - CORRECTED VERSION with 10 credit transfer
app.post('/accept-request', requireAuth, async (req, res) => {
  try {
    const { requestId, exchangeAddress, exchangeTime } = req.body;
    const userId = req.session.user.id;
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const requestIdObj = new mongoose.Types.ObjectId(requestId);

    // Get owner and request details
    const owner = await User.findOne({
      _id: userIdObj,
      'requestedBooks._id': requestIdObj
    });

    if (!owner) return res.status(404).json({ error: 'Request not found' });

    const request = owner.requestedBooks.find(req => req._id.equals(requestIdObj));
    if (!request) return res.status(404).json({ error: 'Request details not found' });

    // Get requester details
    const requesterData = await User.findById(request.requesterId);
    if (!requesterData) {
      return res.status(404).json({ error: 'Requester not found' });
    }

    // Check requester has enough credits
    if (requesterData.credits < 10) { // Changed to 10 credits
      return res.status(400).json({ error: 'Requester does not have enough credits' });
    }

    // Transaction to update both parties
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update owner's request
      await User.updateOne(
        {
          _id: userIdObj,
          'requestedBooks._id': requestIdObj
        },
        {
          $set: {
            'requestedBooks.$.status': 'accepted',
            'requestedBooks.$.exchangeAddress': exchangeAddress,
            'requestedBooks.$.exchangeTime': new Date(exchangeTime)
          }
        },
        { session }
      );

      // Update requester's request
      await User.updateOne(
        {
          _id: request.requesterId,
          'bookRequests._id': requestIdObj
        },
        {
          $set: {
            'bookRequests.$.status': 'accepted',
            'bookRequests.$.exchangeAddress': exchangeAddress,
            'bookRequests.$.exchangeTime': new Date(exchangeTime)
          }
        },
        { session }
      );

      // Update credits - changed to 10 credits
      await User.updateOne(
        { _id: requesterData._id },
        { $inc: { credits: -10 } },   // Changed to 10 credits
        { session }
      );

      await User.updateOne(
        { _id: userIdObj },
        { $inc: { credits: 10 } },    // Changed to 10 credits
        { session }
      );

      // Update book status to borrowed
      await User.updateOne(
        {
          _id: userIdObj,
          'myBooks._id': request.bookId
        },
        {
          $set: { 'myBooks.$.status': 'borrowed' }
        },
        { session }
      );

      // Reject all other pending requests for this book
      const otherRequests = owner.requestedBooks.filter(req =>
        req.bookId.equals(request.bookId) &&
        req.status === 'pending' &&
        !req._id.equals(requestIdObj)
      );

      for (const otherRequest of otherRequests) {
        // Update owner's request
        await User.updateOne(
          { _id: userIdObj, 'requestedBooks._id': otherRequest._id },
          { $set: { 'requestedBooks.$.status': 'rejected' } },
          { session }
        );

        // Update requester's request
        await User.updateOne(
          { _id: otherRequest.requesterId, 'bookRequests._id': otherRequest._id },
          { $set: { 'bookRequests.$.status': 'rejected' } },
          { session }
        );
      }

      await session.commitTransaction();
      res.json({ message: 'Request accepted successfully!' });
    } catch (error) {
      await session.abortTransaction();
      console.error("Acceptance error:", error);
      res.status(500).json({ error: 'Failed to accept request' });
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// Reject Request Endpoint - CORRECTED VERSION
app.post('/reject-request', requireAuth, async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.session.user.id;
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const requestIdObj = new mongoose.Types.ObjectId(requestId);

    // Find owner's request
    const owner = await User.findOne({
      _id: userIdObj,
      'requestedBooks._id': requestIdObj
    });

    if (!owner) return res.status(404).json({ error: 'Request not found' });

    const request = owner.requestedBooks.find(req => req._id.equals(requestIdObj));
    if (!request) return res.status(404).json({ error: 'Request details not found' });

    // Transaction to update both parties
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update owner's request status to rejected
      await User.updateOne(
        {
          _id: userIdObj,
          'requestedBooks._id': requestIdObj
        },
        {
          $set: { 'requestedBooks.$.status': 'rejected' }
        },
        { session }
      );

      // Update requester's request status to rejected
      await User.updateOne(
        {
          _id: request.requesterId,
          'bookRequests._id': requestIdObj
        },
        {
          $set: { 'bookRequests.$.status': 'rejected' }
        },
        { session }
      );

      // Check if there are any other pending requests for this book
      const otherPendingRequests = owner.requestedBooks.filter(req =>
        req.bookId.equals(request.bookId) &&
        req.status === 'pending' &&
        !req._id.equals(requestIdObj)
      );

      // Only revert book status to available if no other pending requests exist
      if (otherPendingRequests.length === 0) {
        await User.updateOne(
          {
            _id: userIdObj,
            'myBooks._id': request.bookId
          },
          {
            $set: { 'myBooks.$.status': 'available' }
          },
          { session }
        );
      } else {
        console.log(`Book ${request.bookId} still has ${otherPendingRequests.length} pending requests`);
      }

      await session.commitTransaction();
      res.json({ message: 'Request rejected successfully!' });
    } catch (error) {
      await session.abortTransaction();
      console.error("Rejection error:", error);
      res.status(500).json({ error: 'Failed to reject request' });
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Mark Book as Available Endpoint
app.post('/mark-available', requireAuth, async (req, res) => {
  try {
    const { bookId } = req.body;
    const userId = req.session.user.id;
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const bookIdObj = new mongoose.Types.ObjectId(bookId);

    // Find the book in user's collection
    const user = await User.findOne({
      _id: userIdObj,
      'myBooks._id': bookIdObj
    });

    if (!user) {
      return res.status(404).json({ error: 'Book not found in your collection' });
    }

    const book = user.myBooks.find(b => b._id.equals(bookIdObj));
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Update book status to available
    await User.updateOne(
      {
        _id: userIdObj,
        'myBooks._id': bookIdObj
      },
      {
        $set: { 'myBooks.$.status': 'available' }
      }
    );

    res.json({ message: 'Book marked as available successfully!' });
  } catch (error) {
    console.error('Mark available error:', error);
    res.status(500).json({ error: 'Failed to mark book as available' });
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

    res.json({ message: 'Book deleted successfully!' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Review Routes
// Add a new review
app.post('/api/reviews', requireAuth, async (req, res) => {
  try {
    const { bookTitle, bookAuthor, bookCover, rating, review } = req.body;

    if (!bookTitle || !bookAuthor || !rating || !review) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Check if user already reviewed this book
    const existingReview = await BookReview.findOne({
      bookTitle,
      userId: req.session.user.id
    });

    if (existingReview) {
      return res.status(400).json({
        msg: 'You have already reviewed this book. You can edit your existing review.'
      });
    }

    const newReview = new BookReview({
      bookTitle,
      bookAuthor,
      bookCover: bookCover || '',
      userId: req.session.user.id,
      userName: req.session.user.fullname || 'Anonymous',
      rating: parseInt(rating),
      review
    });

    await newReview.save();
    res.json(newReview);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get reviews for a book by title
app.get('/api/reviews/book/:bookTitle', async (req, res) => {
  try {
    const bookTitle = decodeURIComponent(req.params.bookTitle);
    const reviews = await BookReview.find({ bookTitle })
      .sort({ createdAt: -1 });

    // Calculate average rating
    const stats = await BookReview.aggregate([
      { $match: { bookTitle } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    res.json({
      reviews,
      stats: stats[0] || { averageRating: 0, reviewCount: 0 }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Book Details with Reviews
app.get('/book/:id', requireAuth, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.session.user.id;

    // Find the book in the database
    const user = await User.findOne({ 'myBooks._id': bookId });
    if (!user) {
      return res.status(404).send('Book not found');
    }

    const book = user.myBooks.id(bookId);
    if (!book) {
      return res.status(404).send('Book not found');
    }

    // Get reviews and stats for this book
    let reviews = [];
    let stats = { averageRating: 0, reviewCount: 0 };

    try {
      const response = await axios.get(`http://localhost:${port}/api/reviews/book/${encodeURIComponent(book.title)}`);
      reviews = response.data.reviews || [];
      stats = response.data.stats || { averageRating: 0, reviewCount: 0 };
    } catch (error) {
      console.error('Error fetching reviews:', error.message);
    }

    // Get similar books based on genre and reviews
    const similarBooks = await User.aggregate([
      { $unwind: '$myBooks' },
      {
        $match: {
          'myBooks.genre': book.genre,
          'myBooks._id': { $ne: book._id },
          'myBooks.status': 'available'
        }
      },
      {
        $lookup: {
          from: 'bookreviews',
          localField: 'myBooks.title',
          foreignField: 'bookTitle',
          as: 'reviews'
        }
      },
      {
        $addFields: {
          averageRating: { $avg: '$reviews.rating' },
          reviewCount: { $size: '$reviews' }
        }
      },
      {
        $match: {
          $or: [
            { averageRating: { $gte: 3 } },
            { reviewCount: { $gte: 1 } }
          ]
        }
      },
      {
        $sort: {
          averageRating: -1,
          reviewCount: -1
        }
      },
      { $limit: 3 },
      {
        $project: {
          _id: '$myBooks._id',
          title: '$myBooks.title',
          author: '$myBooks.author',
          genre: '$myBooks.genre',
          condition: '$myBooks.condition',
          description: '$myBooks.description',
          coverImage: '$myBooks.coverImage',
          averageRating: { $ifNull: [{ $round: ['$averageRating', 1] }, 0] },
          reviewCount: 1,
          owner: {
            fullname: '$fullname',
            userid: '$userid',
            address: '$address'
          }
        }
      }
    ]);

    // Render the book details page with reviews
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${book.title} - ReadCycle</title>
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Roboto', sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
              color: #333;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
            }
            .back-btn {
              display: inline-block;
              margin-bottom: 20px;
              color: #4a90e2;
              text-decoration: none;
              font-weight: 500;
            }
            .book-details {
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              padding: 30px;
              margin-bottom: 30px;
            }
            .book-header {
              display: flex;
              flex-wrap: wrap;
              gap: 30px;
              margin-bottom: 30px;
            }
            .book-cover {
              flex: 0 0 200px;
              height: 300px;
              background-color: #f0f0f0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              color: #999;
              border-radius: 4px;
              overflow: hidden;
            }
            .book-cover img {
              max-width: 100%;
              max-height: 100%;
              object-fit: cover;
            }
            .book-info {
              flex: 1;
              min-width: 300px;
            }
            .book-title {
              font-size: 28px;
              margin: 0 0 10px 0;
              color: #222;
            }
            .book-author {
              font-size: 18px;
              color: #666;
              margin: 0 0 20px 0;
            }
            .book-meta {
              margin: 20px 0;
              color: #666;
            }
            .book-meta div {
              margin-bottom: 8px;
            }
            .rating {
              display: flex;
              align-items: center;
              margin: 10px 0;
            }
            .rating-stars {
              color: #ffc107;
              font-size: 20px;
              margin-right: 10px;
            }
            .rating-value {
              font-size: 18px;
              font-weight: 500;
              margin-left: 5px;
            }
            .section-title {
              font-size: 22px;
              margin: 30px 0 20px 0;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .reviews-section, .similar-books {
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              padding: 30px;
              margin-bottom: 30px;
            }
            .review-form {
              margin-bottom: 30px;
            }
            .form-group {
              margin-bottom: 20px;
            }
            .form-group label {
              display: block;
              margin-bottom: 8px;
              font-weight: 500;
            }
            .rating-input {
              display: flex;
              gap: 10px;
            }
            .rating-input input[type="radio"] {
              display: none;
            }
            .rating-input label {
              font-size: 24px;
              color: #ddd;
              cursor: pointer;
            }
            .rating-input input:checked ~ label {
              color: #ffc107;
            }
            .rating-input label:hover,
            .rating-input label:hover ~ label {
              color: #ffc107;
            }
            textarea {
              width: 100%;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
              min-height: 100px;
              resize: vertical;
              font-family: inherit;
            }
            .btn {
              background-color: #4a90e2;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              transition: background-color 0.3s;
            }
            .btn:hover {
              background-color: #357abd;
            }
            .reviews-list {
              margin-top: 20px;
            }
            .review-card {
              border-bottom: 1px solid #eee;
              padding: 20px 0;
            }
            .review-card:last-child {
              border-bottom: none;
            }
            .review-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              color: #666;
            }
            .reviewer {
              font-weight: 500;
              color: #333;
            }
            .review-rating {
              color: #ffc107;
            }
            .review-date {
              font-size: 14px;
            }
            .review-content {
              line-height: 1.6;
            }
            .similar-books-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 20px;
              margin-top: 20px;
            }
            .similar-book {
              background: #f9f9f9;
              padding: 15px;
              border-radius: 4px;
              text-align: center;
            }
            .similar-book-title {
              font-weight: 500;
              margin: 10px 0 5px 0;
            }
            .similar-book-rating {
              color: #ffc107;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <a href="/find-books" class="back-btn">← Back to Books</a>

            <div class="book-details">
              <div class="book-header">
                <div class="book-cover">
                  ${book.coverImage ?
        `<img src="${book.coverImage}" alt="${book.title}">` :
        'No Cover'
      }
                </div>
                <div class="book-info">
                  <h1 class="book-title">${book.title}</h1>
                  <p class="book-author">by ${book.author || 'Unknown Author'}</p>

                  <div class="rating">
                    <div class="rating-stars">
                      ${'★'.repeat(Math.round(stats.averageRating))}${'☆'.repeat(5 - Math.round(stats.averageRating))}
                    </div>
                    <span class="rating-value">${stats.averageRating.toFixed(1)} (${stats.reviewCount} reviews)</span>
                  </div>

                  <div class="book-meta">
                    <div><strong>Genre:</strong> ${book.genre || 'Not specified'}</div>
                    <div><strong>Condition:</strong> ${book.condition || 'Not specified'}</div>
                    <div><strong>Owner:</strong> ${user.fullname} (${user.userid})</div>
                    <div><strong>Location:</strong> ${user.address || 'Not specified'}</div>
                  </div>

                  <div>
                    <p><strong>Description:</strong></p>
                    <p>${book.description || 'No description available.'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="reviews-section">
              <h2 class="section-title">Reviews</h2>

              <div class="review-form">
                <h3>Write a Review</h3>
                <form id="review-form">
                  <input type="hidden" id="book-title" value="${book.title}">
                  <input type="hidden" id="book-author" value="${book.author}">
                  <input type="hidden" id="book-cover" value="${book.coverImage || ''}">
                  <div class="form-group">
                    <label>Rating:</label>
                    <div class="rating-input">
                      ${[5, 4, 3, 2, 1].map(star => `
                        <input type="radio" id="star${star}" name="rating" value="${star}" required>
                        <label for="star${star}" title="${star} stars">★</label>
                      `).join('')}
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="review-text">Your Review:</label>
                    <textarea id="review-text" name="review" rows="4" required></textarea>
                  </div>
                  <button type="submit" class="btn">Submit Review</button>
                </form>
              </div>

              <div id="reviews-container">
                ${reviews && reviews.length > 0 ?
        reviews.map(review => `
                    <div class="review">
                      <div class="review-header">
                        <span class="reviewer">${review.userName}</span>
                        <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
                        <div class="review-rating">
                          ${Array(5).fill().map((_, i) =>
          `<span class="star ${i < review.rating ? 'filled' : ''}">★</span>`
        ).join('')}
                        </div>
                      </div>
                      <p class="review-text">${review.review}</p>
                    </div>
                  `).join('') :
        '<p class="no-reviews">No reviews yet. Be the first to review this book!</p>'
      }
              </div>
            </div>

            ${similarBooks.length > 0 ? `
              <div class="similar-books">
                <h2 class="section-title">Similar Books You Might Like</h2>
                <div class="books-grid">
                  ${similarBooks && similarBooks.length > 0 ?
          similarBooks.map(book => `
                      <div class="book-card">
                        <div class="book-cover">
                          ${book.coverImage ?
              `<img src="${book.coverImage}" alt="${book.title}">` :
              '<div class="no-cover">No Cover</div>'
            }
                          ${book.averageRating > 0 ? `
                            <div class="book-rating">
                              ${Array(5).fill().map((_, i) =>
              `<span class="star ${i < Math.round(book.averageRating) ? 'filled' : ''}">★</span>`
            ).join('')}
                              <span>${book.averageRating} (${book.reviewCount})</span>
                            </div>
                          ` : ''}
                        </div>
                        <div class="book-details">
                          <h3>${book.title}</h3>
                          <p class="author">by ${book.author}</p>
                          <p class="genre">${book.genre || 'No genre'}</p>
                          <p class="condition">Condition: ${book.condition || 'Not specified'}</p>
                          <a href="/book/${book._id}" class="btn">View Details</a>
                        </div>
                      </div>
                    `).join('') :
          '<p>No similar books found. Check back later for recommendations.</p>'
        }
                </div>
              </div>
            ` : ''}
          </div>

          <script>
            document.getElementById('review-form').addEventListener('submit', async function(e) {
              e.preventDefault();
              
              const formData = {
                bookTitle: document.getElementById('book-title').value,
                bookAuthor: document.getElementById('book-author').value,
                bookCover: document.getElementById('book-cover').value,
                rating: document.querySelector('input[name="rating"]:checked').value,
                review: document.getElementById('review-text').value
              };

              try {
                const response = await fetch('/api/reviews', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(formData)
                });

                if (response.ok) {
                  alert('Review submitted successfully!');
                  location.reload();
                } else {
                  const result = await response.json();
                  alert('Error: ' + result.msg);
                }
              } catch (error) {
                console.error('Error submitting review:', error);
                alert('An error occurred. Please try again.');
              }
            });
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error fetching book details:', error);
    res.status(500).send('Error fetching book details');
  }
});

// Content Recommender Engine
class ContentRecommender {
  constructor() {
    this.stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'it', 'that', 'this']);
    this.idf = {};
    this.documents = [];
    this.documentVectors = [];
  }

  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.has(word));
  }

  addDocument(doc) {
    const tokens = this.tokenize(doc.text);
    this.documents.push({ id: doc.id, tokens, original: doc.original });
  }

  calculateTF(tokens) {
    const tf = {};
    tokens.forEach(token => {
      tf[token] = (tf[token] || 0) + 1;
    });
    return tf;
  }

  calculateIDF() {
    const vocabulary = new Set();
    this.documents.forEach(doc => doc.tokens.forEach(token => vocabulary.add(token)));

    vocabulary.forEach(term => {
      const docCount = this.documents.filter(doc => doc.tokens.includes(term)).length;
      this.idf[term] = Math.log(this.documents.length / (1 + docCount));
    });
  }

  calculateTFIDF(tokens) {
    const tf = this.calculateTF(tokens);
    const vector = {};
    Object.keys(tf).forEach(term => {
      if (this.idf[term]) {
        vector[term] = tf[term] * this.idf[term];
      }
    });
    return vector;
  }

  cosineSimilarity(vec1, vec2) {
    const intersection = Object.keys(vec1).filter(term => vec2.hasOwnProperty(term));
    if (intersection.length === 0) return 0;

    let dotProduct = 0;
    intersection.forEach(term => {
      dotProduct += vec1[term] * vec2[term];
    });

    const mag1 = Math.sqrt(Object.values(vec1).reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(Object.values(vec2).reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (mag1 * mag2);
  }

  processDocuments() {
    this.calculateIDF();
    this.documents.forEach(doc => {
      this.documentVectors.push({
        id: doc.id,
        vector: this.calculateTFIDF(doc.tokens),
        original: doc.original
      });
    });
  }

  getRecommendations(userHistory, k = 5) {
    const userTokens = this.tokenize(userHistory.map(h => `${h.title} ${h.author} ${h.genre} ${h.ideas || ''}`).join(' '));
    const userVector = this.calculateTFIDF(userTokens);

    // Get authors and genres from user history for boosting
    const userAuthors = new Set(userHistory.map(h => h.author.toLowerCase()));
    const userGenres = new Set(userHistory.map(h => h.genre.toLowerCase()));

    const scores = this.documentVectors.map(docVec => {
      let score = this.cosineSimilarity(userVector, docVec.vector);

      // Author Boosting (+50%)
      if (userAuthors.has(docVec.original.author.toLowerCase())) {
        score *= 1.5;
      }

      // Genre Boosting (+30%)
      if (userGenres.has(docVec.original.genre.toLowerCase())) {
        score *= 1.3;
      }

      return { ...docVec.original, score };
    });

    return scores
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

// My Reads & Recommendations Page
app.get('/my-reads', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    const myReads = user.myReads || [];

    const myReadsHtml = myReads.length > 0 ? myReads.map(read => `
      <div class="read-card">
        <h3>${read.title}</h3>
        <p><strong>Author:</strong> ${read.author}</p>
        <p><strong>Genre:</strong> ${read.genre}</p>
        <p class="read-date">Read on ${new Date(read.readAt).toLocaleDateString()}</p>
        <div class="ideas-section">
          <strong>Key Takeaways:</strong>
          <p>${read.ideas}</p>
        </div>
      </div>
    `).join('') : '<p class="no-reads">No books logged yet. Add your first read to get recommendations!</p>';

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>My Reads & Smart Picks - ReadCycle</title>
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
              max-width: 1000px;
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
              margin-bottom: 20px;
            }

            /* Tabs */
            .tabs {
              display: flex;
              border-bottom: 2px solid #eee;
              margin-bottom: 20px;
            }
            .tab-btn {
              padding: 10px 20px;
              border: none;
              background: none;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              color: #666;
              border-bottom: 3px solid transparent;
            }
            .tab-btn.active {
              color: #4CAF50;
              border-bottom-color: #4CAF50;
            }
            .tab-content {
              display: none;
            }
            .tab-content.active {
              display: block;
            }

            .reads-grid, .recommendations-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
              gap: 20px;
            }

            .read-card {
              background: #f8f9fa;
              border-radius: 10px;
              padding: 20px;
              border-left: 5px solid #2196F3;
            }
            .read-card h3 {
              margin-top: 0;
              color: #2c3e50;
            }
            .read-date {
              color: #888;
              font-size: 0.9em;
              margin-bottom: 10px;
            }
            .ideas-section {
              background: #fff;
              padding: 10px;
              border-radius: 5px;
              margin-top: 10px;
              font-style: italic;
            }

            .recommendation-card {
              border-left: 5px solid #FF9800;
              position: relative;
            }
            .match-badge {
              position: absolute;
              top: 10px;
              right: 10px;
              background: #FF9800;
              color: white;
              padding: 5px 10px;
              border-radius: 15px;
              font-size: 12px;
              font-weight: bold;
            }

            .btn {
              background: #2196F3;
              color: white;
              padding: 8px 15px;
              border-radius: 5px;
              text-decoration: none;
              display: inline-block;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <a href="/dashboard" class="back-btn">← Back to Dashboard</a>
              <h1>My Reading Journey</h1>
            </div>

            <div class="tabs">
              <button class="tab-btn active" onclick="openTab(event, 'my-reads')">My Reads</button>
              <button class="tab-btn" onclick="openTab(event, 'smart-picks')">✨ Smart Picks</button>
            </div>

            <!-- My Reads Tab -->
            <div id="my-reads" class="tab-content active">
              <a href="/add-read" class="add-btn">+ Log a New Read</a>
              <div class="reads-grid">
                ${myReadsHtml}
              </div>
            </div>

            <!-- Smart Picks Tab -->
            <div id="smart-picks" class="tab-content">
              <div class="recommendations-header" style="margin-bottom: 20px;">
                <h3>Recommended for You</h3>
                <p>Based on your reading history and key takeaways.</p>
              </div>
              <div id="recommendations-container" class="recommendations-container"></div>
            </div>

          </div>

          <script>
            function openTab(evt, tabName) {
              var i, tabcontent, tablinks;
              tabcontent = document.getElementsByClassName("tab-content");
              for (i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
                tabcontent[i].classList.remove("active");
              }
              tablinks = document.getElementsByClassName("tab-btn");
              for (i = 0; i < tablinks.length; i++) {
                tablinks[i].classList.remove("active");
              }
              document.getElementById(tabName).style.display = "block";
              document.getElementById(tabName).classList.add("active");
              evt.currentTarget.classList.add("active");
            }
          </script>
           <script src="/js/reviews.js"></script>
            <style>
            .recommendations-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }
            .recommendation-card {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 15px;
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            .recommendation-card img {
                width: 100%;
                height: 300px;
                object-fit: cover;
                border-radius: 4px;
                margin-bottom: 10px;
            }
            .recommendation-title {
                font-weight: bold;
                margin-bottom: 5px;
            }
            .recommendation-rating {
                color: #ffc107;
                font-size: 0.9em;
            }
        </style>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error loading my reads:', error);
    res.status(500).send('Error loading page');
  }
});

app.get('/add-read', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Log a Read - ReadCycle</title>
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
        h1 { color: #4CAF50; text-align: center; margin-bottom: 20px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; }
        input, select, textarea {
          width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 16px;
           box-sizing: border-box;
        }
        button {
          background: #4CAF50; color: white; border: none; padding: 12px 24px;
          border-radius: 8px; cursor: pointer; font-size: 16px; width: 100%; transition: background 0.3s;
        }
        button:hover { background: #45a049; }
        .back-link { display: block; text-align: center; margin-top: 15px; color: #2575fc; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Log a Read Book</h1>
        <form id="add-read-form">
          <div class="form-group">
            <label for="title">Book Title *</label>
            <input type="text" id="title" name="title" required>
          </div>
          <div class="form-group">
            <label for="author">Author *</label>
            <input type="text" id="author" name="author" required>
          </div>
          <div class="form-group">
            <label for="genre">Genre (for recommendations)</label>
            <select id="genre" name="genre">
              <option value="">Select genre...</option>
              <option value="Fiction">Fiction</option>
              <option value="Non-Fiction">Non-Fiction</option>
              <option value="Science Fiction">Science Fiction</option>
              <option value="Fantasy">Fantasy</option>
              <option value="Mystery">Mystery</option>
              <option value="Thriller">Thriller</option>
              <option value="Romance">Romance</option>
              <option value="Historical Fiction">Historical Fiction</option>
              <option value="Biography">Biography</option>
              <option value="Autobiography">Autobiography</option>
              <option value="Memoir">Memoir</option>
              <option value="Science">Science</option>
              <option value="Technology">Technology</option>
              <option value="History">History</option>
              <option value="Psychology">Psychology</option>
              <option value="Self-Help">Self-Help</option>
              <option value="Business">Business</option>
              <option value="Philosophy">Philosophy</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="ideas">My Ideas / Key Takeaways *</label>
            <textarea id="ideas" name="ideas" rows="5" placeholder="What did you learn? What were the best parts?" required></textarea>
          </div>
          <button type="submit">Save to My Reads</button>
        </form>
        <a href="/my-reads" class="back-link">Cancel</a>
      </div>
      <script>
        document.getElementById('add-read-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = {
            title: document.getElementById('title').value,
            author: document.getElementById('author').value,
            genre: document.getElementById('genre').value,
            ideas: document.getElementById('ideas').value
          };
          try {
            const res = await fetch('/add-read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
            });
            if (res.ok) {
              window.location.href = '/my-reads';
            } else {
              alert('Failed to add read.');
            }
          } catch (err) {
            console.error(err);
            alert('Error submitting form.');
          }
        });
      </script>
    </body>
    </html>
  `);
});

app.post('/add-read', requireAuth, async (req, res) => {
  try {
    const { title, author, genre, ideas } = req.body;
    const newRead = {
      _id: new mongoose.Types.ObjectId(),
      title,
      author,
      genre,
      ideas, // Required
      readAt: new Date()
    };
    await User.findByIdAndUpdate(req.session.user.id, {
      $push: { myReads: newRead }
    });
    res.json({ message: 'Read logged successfully!' });
  } catch (error) {
    console.error('Error adding read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
const server = app.listen(3020, () => {
  console.log(`🚀 ReadCycle server running on http://localhost:3020`);
  console.log("📚 Ready to connect book lovers!");
  console.log("✅ MongoDB connected");
});

// Handle any unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle any uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});