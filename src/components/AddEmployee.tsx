import React, { useState } from 'react';
import { supabase } from '../supabase';

const AddEmployee = () => {
  const [name, setName] = useState('');
  const [manwayNo, setManwayNo] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!name || !manwayNo || !serialNumber) {
      setMessage('Please fill out Name, Manway No., and Serial Number.');
      return;
    }

    const { error } = await supabase
      .from('employees')
      .insert([{ 
        manway_no: manwayNo,
        name, 
        phone_no: phoneNo,
        serial_number: parseInt(serialNumber, 10)
      }]);

    if (error) {
      setMessage('Error adding employee. Please try again.');
      console.error("Error adding document: ", error);
    } else {
      setMessage('Employee added successfully!');
      setName('');
      setManwayNo('');
      setPhoneNo('');
      setSerialNumber('');
    }
  };

  return (
    <div className="form-container">
      <h2>Add New Employee</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Manway No."
          value={manwayNo}
          onChange={(e) => setManwayNo(e.target.value)}
        />
        <input
          type="text"
          placeholder="Phone No. (Optional)"
          value={phoneNo}
          onChange={(e) => setPhoneNo(e.target.value)}
        />
        <input
          type="number"
          placeholder="Serial Number"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
        />
        <button type="submit">Add Employee</button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default AddEmployee;
