import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { auth, googleProvider } from './firebase';
import {
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
import MarkEligibility from './components/MarkEligibility';
import ViewEligibility from './components/ViewEligibility';
import MarkOtAttendance from './components/MarkOtAttendance';
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
  const [error, setError] = useState('');

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
      <h2>Login</h2>
      <button onClick={handleGuestLogin}>Guest Login</button>
      <button onClick={handleGoogleLogin}>Sign in with Google</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

const MainApp = ({ user }: { user: User }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const userIsAdmin = user.email?.toLowerCase() === 'jgireesa@gmail.com' || user.email?.toLowerCase() === 'dineshjagadam@gmail.com';

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
                  <Link to="/mark-eligibility" onClick={closeMenu}>Mark Eligibility</Link>
                  <Link to="/mark-ot-attendance" onClick={closeMenu}>Mark OT Attendance</Link>
                  <Link to="/add-employee" onClick={closeMenu}>Add Employee</Link>
                  <Link to="/employees" onClick={closeMenu}>Employee List</Link>
                  <Link to="/holidays" onClick={closeMenu}>Manage Holidays</Link>
                  <Link to="/report" onClick={closeMenu}>Weekly Report</Link>
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
              <Route path="/mark-eligibility" element={<MarkEligibility userIsAdmin={userIsAdmin} />} />
              <Route path="/mark-ot-attendance" element={<MarkOtAttendance />} />
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
              <Route path="/eligibility" element={<ViewEligibility />} />
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
