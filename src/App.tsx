import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { auth, googleProvider } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import AddEmployee from './components/AddEmployee';
import EmployeeList from './components/EmployeeList';
import TakeAttendance from './components/TakeAttendance';
import WeeklyReport from './components/WeeklyReport';
import LastSerialTracker from './components/LastSerialTracker';
import PublicHolidays from './components/PublicHolidays';
import Eligibility from './components/Eligibility';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={!user ? <Auth /> : <Navigate to="/" />} />
          <Route path="/*" element={user ? <MainApp user={user} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGuestLogin = async () => {
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login or Sign Up</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleGuestLogin}>Guest Login</button>
      <button onClick={handleGoogleLogin}>Sign in with Google</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

const MainApp = ({ user }: { user: User }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const userIsAdmin = user.email?.toLowerCase() === 'jgireesa@gmail.com';

  const handleLogout = async () => {
    await signOut(auth);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav>
        <div className="nav-left">
          <div className={`dropdown ${isMenuOpen ? 'open' : ''}`}>
            <button className="menu-button" onClick={toggleMenu}>
              &#9776; Menu
            </button>
            <div className="dropdown-content">
              {userIsAdmin ? (
                <>
                  <Link to="/" onClick={closeMenu}>Take Attendance</Link>
                  <Link to="/eligibility" onClick={closeMenu}>Eligibility</Link>
                  <Link to="/add-employee" onClick={closeMenu}>Add Employee</Link>
                  <Link to="/employees" onClick={closeMenu}>Employee List</Link>
                  <Link to="/holidays" onClick={closeMenu}>Manage Holidays</Link>
                  <Link to="/report" onClick={closeMenu}>Weekly Report</Link>
                  <Link to="/attendance-report" onClick={closeMenu}>Attendance Report</Link>
                  <Link to="/tracker" onClick={closeMenu}>Serial Tracker</Link>
                </>
              ) : (
                <>
                  <Link to="/employees" onClick={closeMenu}>Employee List</Link>
                  <Link to="/eligibility" onClick={closeMenu}>Eligibility</Link>
                  <Link to="/report" onClick={closeMenu}>Weekly Report</Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="nav-right">
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </nav>
      <main>
        <Routes>
          {userIsAdmin ? (
            <>
              <Route path="/" element={<TakeAttendance />} />
              <Route path="/eligibility" element={<Eligibility />} />
              <Route path="/add-employee" element={<AddEmployee />} />
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/holidays" element={<PublicHolidays />} />
              <Route path="/report" element={<WeeklyReport />} />
              <Route path="/tracker" element={<LastSerialTracker />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Navigate to="/employees" />} />
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/eligibility" element={<Eligibility />} />
              <Route path="/report" element={<WeeklyReport />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  );
};

export default App;
