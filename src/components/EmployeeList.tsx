import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const EmployeeList = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('serial_number', { ascending: true });

      if (error) {
        console.error('Error fetching employees:', error);
      } else {
        setEmployees(data);
      }
      setLoading(false);
    };

    fetchEmployees();
  }, []);

  if (loading) {
    return <p>Loading employees...</p>;
  }

  return (
    <div className="table-container">
      <h2>Employee List</h2>
      <table>
        <thead>
          <tr>
            <th>S.No.</th>
            <th>Manway No.</th>
            <th>Name</th>
            <th>Phone No.</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(employee => (
            <tr key={employee.manway_no}>
              <td>{employee.serial_number}</td>
              <td>{employee.manway_no}</td>
              <td>{employee.name}</td>
              <td><a href={`tel:${employee.phone_no}`}>{employee.phone_no}</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeList;
