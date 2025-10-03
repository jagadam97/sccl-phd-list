import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface SerialTracker {
  category: string;
  last_serial_number: number;
}

const LastSerialTracker = () => {
  const [trackers, setTrackers] = useState<SerialTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [newNumbers, setNewNumbers] = useState<{ [key: string]: string }>({});

  const fetchTrackers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('last_serials')
      .select('*');

    if (error) {
      console.error('Error fetching trackers:', error);
    } else {
      setTrackers(data);
      const initialNewNumbers = data.reduce((acc, tracker) => {
        acc[tracker.category] = tracker.last_serial_number.toString();
        return acc;
      }, {} as { [key: string]: string });
      setNewNumbers(initialNewNumbers);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrackers();
  }, []);

  const handleInputChange = (category: string, value: string) => {
    setNewNumbers(prev => ({ ...prev, [category]: value }));
  };

  const handleUpdate = async (category: string) => {
    const newSerialNumber = parseInt(newNumbers[category], 10);
    if (isNaN(newSerialNumber)) {
      setMessage('Please enter a valid number.');
      return;
    }

    const { error } = await supabase
      .from('last_serials')
      .update({ last_serial_number: newSerialNumber })
      .eq('category', category);

    if (error) {
      setMessage(`Error updating ${category}.`);
      console.error(`Error updating ${category}:`, error);
    } else {
      setMessage(`${category} updated successfully!`);
      fetchTrackers(); // Refresh the list
    }
  };

  if (loading) {
    return <p>Loading trackers...</p>;
  }

  return (
    <div className="dashboard">
      <h2>Last Serial Number Tracker</h2>
      {message && <p className="message">{message}</p>}
      <div className="tracker-list">
        {trackers.map(tracker => (
          <div key={tracker.category} className="tracker-item">
            <h3>{tracker.category}</h3>
            <div className="tracker-controls">
              <input
                type="number"
                value={newNumbers[tracker.category] || ''}
                onChange={(e) => handleInputChange(tracker.category, e.target.value)}
              />
              <button onClick={() => handleUpdate(tracker.category)}>Update</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LastSerialTracker;
