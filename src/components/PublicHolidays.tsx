import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface PublicHoliday {
  date: string;
  description: string;
}

const PublicHolidays = () => {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const fetchHolidays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('public_holidays')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching holidays:', error);
    } else {
      setHolidays(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAddHoliday = async () => {
    setMessage('');
    if (!newDate || !newDescription) {
      setMessage('Please fill in both date and description.');
      return;
    }

    const { error } = await supabase
      .from('public_holidays')
      .insert([{ date: newDate, description: newDescription }]);

    if (error) {
      setMessage('Error adding holiday. Please try again.');
      console.error('Error adding holiday:', error);
    } else {
      setMessage('Public holiday added successfully!');
      setNewDate('');
      setNewDescription('');
      fetchHolidays();
    }
  };

  const handleDeleteHoliday = async (date: string) => {
    const { error } = await supabase
      .from('public_holidays')
      .delete()
      .eq('date', date);

    if (error) {
      setMessage('Error deleting holiday.');
      console.error('Error deleting holiday:', error);
    } else {
      setMessage('Holiday deleted successfully!');
      fetchHolidays();
    }
  };

  if (loading) {
    return <p>Loading holidays...</p>;
  }

  return (
    <div className="dashboard">
      <h2>Manage Public Holidays</h2>
      {message && <p className="message">{message}</p>}
      
      <div className="form-section">
        <h3>Add New Public Holiday</h3>
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          placeholder="Select Date"
        />
        <input
          type="text"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Holiday Description"
        />
        <button onClick={handleAddHoliday}>Add Holiday</button>
      </div>

      <div className="holidays-list">
        <h3>Current Public Holidays</h3>
        {holidays.length === 0 ? (
          <p>No public holidays added yet.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map(holiday => (
                  <tr key={holiday.date}>
                    <td>{new Date(holiday.date).toLocaleDateString('en-GB')}</td>
                    <td>{holiday.description}</td>
                    <td>
                      <button 
                        onClick={() => handleDeleteHoliday(holiday.date)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicHolidays;
