const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const port = 3019;

// Connect to MongoDB
mongoose.connect("mongodb+srv://HetviK22:HetviK76004@cluster0.wrddkah.mongodb.net/ReadCycle", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public'

// User schema
const userSchema = new mongoose.Schema({
  fullname: String,
  userid: String,
  phone: String,
  email: String,
  address: String,
  password: String
});

const User = mongoose.model("Users", userSchema);

// Handle form submission
app.post('/submit', async (req, res) => {
  const { fullname, userid, no, email, address, password, verifyPassword } = req.body;

  if (password !== verifyPassword) {
    return res.send("Passwords do not match.");
  }

  const newUser = new User({
    fullname,
    userid,
    phone: no,
    email,
    address,
    password
  });

  try {
    await newUser.save();
    res.send("User registered successfully!");
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).send("Error registering user.");
  }
});

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
