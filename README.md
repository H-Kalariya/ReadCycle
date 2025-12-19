# 📚 ReadCycle

**ReadCycle** is a modern, full-stack peer-to-peer book exchange platform designed to build a thriving community of readers. Share your library, discover new stories, and track your reading journey—all in one place.

---

## ✨ Features

- **🔄 Community Exchange**: Seamlessly request books from other users and manage your own collection.
- **💎 Credit System**: A balanced economy where sharing books earns you credits, which can be used to request new ones.
- **🔍 Smart Browse**: Powerful search and filtering to help you find exactly what you're looking for.
- **📖 Reading Journey**: Log your finished books, save key takeaways, and build a digital legacy of your reading.
- **🎯 Personalized Picks**: Smart recommendations based on your interests and reading history.
- **⚡ Premium UI**: A fast, responsive, and aesthetically pleasing interface built with modern animations.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion (Animations)
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose ODM
- **Icons**: Heroicons

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/H-Kalariya/ReadCycle.git
cd ReadCycle
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Environment Setup
Create a `.env` file in the `server` directory and add your MongoDB URI:
```env
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_secret_key
```

### 4. Run the Application
```bash
# From the root directory
npm run dev
```
The app will be available at `http://localhost:5173` (Frontend) and `http://localhost:3020` (Backend).

---

## 🤝 Contributing
Contributions are welcome! Feel free to open an issue or submit a pull request.

---

## 📄 License
Distributed under the MIT License.

---
*Happy Reading!* 📖✨
