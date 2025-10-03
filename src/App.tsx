import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
import AttendanceReport from './components/AttendanceReport';
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

  const handleSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
      <button onClick={handleSignUp}>Sign Up</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

const MainApp = ({ user }: { user: User }) => {
  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <>
      <nav>
        <div className="nav-left">
          <div className="dropdown">
            <button className="menu-button">
              &#9776; Menu
            </button>
            <div className="dropdown-content">
              <Link to="/">Take Attendance</Link>
              <Link to="/eligibility">Eligibility</Link>
              <Link to="/add-employee">Add Employee</Link>
              <Link to="/employees">Employee List</Link>
              <Link to="/holidays">Manage Holidays</Link>
              <Link to="/report">Weekly Report</Link>
              <Link to="/attendance-report">Attendance Report</Link>
              <Link to="/tracker">Serial Tracker</Link>
            </div>
          </div>
        </div>
        <div className="nav-right">
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<TakeAttendance />} />
          <Route path="/eligibility" element={<Eligibility />} />
          <Route path="/add-employee" element={<AddEmployee />} />
          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/holidays" element={<PublicHolidays />} />
          <Route path="/report" element={<WeeklyReport />} />
          <Route path="/attendance-report" element={<AttendanceReport />} />
          <Route path="/tracker" element={<LastSerialTracker />} />
        </Routes>
      </main>
    </>
  );
};

export default App;
