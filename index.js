const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const port = 3019;

// Connect to MongoDB
mongoose.connect("mongodb+srv://HetviK22:HetviK76004@cluster0.wrddkah.mongodb.net/ReadCycle", {
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
  secret: 'your-secret-key-here', // Change this to a secure secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Enhanced user schema with password hashing
const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  userid: { type: String, unique: true, required: true },
  phone: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
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
      password
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
              <h4>📚 My Books</h4>
              <p>Manage your book collection</p>
            </div>
            <div class="feature-card">
              <h4>🔍 Find Books</h4>
              <p>Discover new books to borrow</p>
            </div>
            <div class="feature-card">
              <h4>📝 Book Requests</h4>
              <p>View pending requests</p>
            </div>
            <div class="feature-card">
              <h4>📖 Reading History</h4>
              <p>Track your reading journey</p>
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

// Legacy route (for backward compatibility)
app.post('/submit', async (req, res) => {
  // Redirect to new signup endpoint
  req.url = '/signup';
  return app._router.handle(req, res);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});