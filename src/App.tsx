import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Browse from './pages/Books/Browse';
import BookDetails from './pages/Books/BookDetails';
import MyBooks from './pages/Books/MyBooks';
import MyReads from './pages/Books/MyReads';
import Requests from './pages/Books/Requests';

import { AuthProvider } from './context/AuthContext';

import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-center" />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/book/:id" element={<BookDetails />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/my-books" element={<MyBooks />} />
              <Route path="/my-reads" element={<MyReads />} />
              <Route path="/requests" element={<Requests />} />
            </Route>
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
