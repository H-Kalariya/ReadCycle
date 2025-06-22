# ReadCycle - Book Sharing Platform

A modern web application that allows users to share and borrow books within their community. Built with Node.js, Express, and MongoDB.

## Features

- **User Registration & Authentication**: Secure user registration with unique user ID, phone, and email validation
- **Book Management**: Add, edit, and manage your book collection
- **Book Discovery**: Search and filter books by genre, author, location, and condition
- **Request System**: Request books from other users with a credit-based system
- **Credit Economy**: Users start with 20 credits, spend 10 credits per book request
- **Real-time Status Updates**: Track book availability and request status

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: bcrypt for password hashing, express-session for session management
- **Frontend**: HTML, CSS, JavaScript (Vanilla)

## Local Development

### Prerequisites

- Node.js (version 16 or higher)
- MongoDB Atlas account (or local MongoDB)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ReadCycle
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (create a `.env` file):
```env
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
NODE_ENV=development
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3019`

## Deployment on Render

### Step 1: Prepare Your Repository

1. Make sure your code is pushed to a Git repository (GitHub, GitLab, etc.)
2. Ensure your `package.json` has the correct start script: `"start": "node index.js"`

### Step 2: Deploy on Render

1. **Sign up/Login to Render**:
   - Go to [render.com](https://render.com)
   - Sign up or log in to your account

2. **Create a New Web Service**:
   - Click "New +" and select "Web Service"
   - Connect your Git repository
   - Select the repository containing your ReadCycle code

3. **Configure the Web Service**:
   - **Name**: `readcycle` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Choose "Free" for testing or "Starter" for production

4. **Set Environment Variables**:
   - Click on "Environment" tab
   - Add the following environment variables:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `SESSION_SECRET`: A secure random string for session encryption
     - `NODE_ENV`: `production`

5. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy your application
   - Wait for the deployment to complete (usually 2-5 minutes)

### Step 3: Configure MongoDB Atlas

1. **Create MongoDB Atlas Cluster** (if you don't have one):
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Create a free account and cluster

2. **Get Connection String**:
   - In your Atlas dashboard, click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `ReadCycle`

3. **Network Access**:
   - In Atlas, go to "Network Access"
   - Add `0.0.0.0/0` to allow connections from anywhere (for Render)

### Step 4: Update Environment Variables

1. In your Render dashboard, go to your web service
2. Click "Environment" tab
3. Update the `MONGODB_URI` with your actual MongoDB connection string
4. Set `SESSION_SECRET` to a secure random string
5. Redeploy the service

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3019 |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `SESSION_SECRET` | Secret for session encryption | Yes | - |
| `NODE_ENV` | Environment mode | No | development |

## API Endpoints

- `GET /` - Landing page (login/signup)
- `POST /signup` - User registration
- `POST /login` - User authentication
- `GET /dashboard` - User dashboard
- `GET /add-book` - Add book page
- `POST /add-book` - Add book endpoint
- `GET /my-books` - User's book collection
- `GET /find-books` - Search and browse books
- `POST /request-book` - Request a book
- `GET /requests` - View book requests
- `POST /accept-request` - Accept a book request
- `POST /reject-request` - Reject a book request
- `POST /delete-book` - Delete a book
- `POST /mark-available` - Mark book as available
- `GET /logout` - User logout

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- Input validation and sanitization
- CORS protection
- Secure cookie configuration for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository or contact the development team.
