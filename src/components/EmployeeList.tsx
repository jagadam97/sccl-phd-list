import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { auth } from '../firebase';

interface Employee {
  serial_number: number;
  manway_no: string;
  name: string;
  phone_no: string;
}

const EmployeeList = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    serial_number: '',
    manway_no: '',
    name: '',
    phone_no: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userEmail = auth.currentUser?.email?.toLowerCase();
  const userIsAdmin = userEmail === 'jgireesa@gmail.com' || userEmail === 'dineshjagadam@gmail.com';

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('serial_number', { ascending: true });

    if (error) {
      console.error('Error fetching employees:', error);
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditForm({
      serial_number: employee.serial_number.toString(),
      manway_no: employee.manway_no,
      name: employee.name,
      phone_no: employee.phone_no
    });
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setEditForm({
      serial_number: '',
      manway_no: '',
      name: '',
      phone_no: ''
    });
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setUpdateLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          serial_number: parseInt(editForm.serial_number),
          manway_no: editForm.manway_no,
          name: editForm.name,
          phone_no: editForm.phone_no
        })
        .eq('manway_no', editingEmployee.manway_no);

      if (updateError) {
        setError(`Error updating employee: ${updateError.message}`);
      } else {
        setSuccess('Employee updated successfully!');
        await fetchEmployees();
        setTimeout(() => {
          handleCancelEdit();
        }, 1500);
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return <p>Loading employees...</p>;
  }

  return (
    <div className="table-container">
      <h2>Employee List</h2>
      
      {editingEmployee && (
        <>
          {/* Modal Overlay */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}
            onClick={handleCancelEdit}
          >
            {/* Modal Content */}
            <div 
              style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Edit Employee</h3>
              <form onSubmit={handleUpdate}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Serial Number:
                    <input
                      type="number"
                      name="serial_number"
                      value={editForm.serial_number}
                      onChange={handleInputChange}
                      required
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Manway No.:
                    <input
                      type="text"
                      name="manway_no"
                      value={editForm.manway_no}
                      onChange={handleInputChange}
                      required
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Name:
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleInputChange}
                      required
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Phone No.:
                    <input
                      type="text"
                      name="phone_no"
                      value={editForm.phone_no}
                      onChange={handleInputChange}
                      required
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </label>
                </div>
                {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
                {success && <p style={{ color: 'green', marginBottom: '10px' }}>{success}</p>}
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button 
                    type="submit" 
                    disabled={updateLoading}
                    style={{ 
                      flex: 1,
                      padding: '10px 20px', 
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: updateLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    {updateLoading ? 'Updating...' : 'Update Employee'}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCancelEdit}
                    style={{ 
                      flex: 1,
                      padding: '10px 20px', 
                      backgroundColor: '#6c757d', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      <table>
        <thead>
          <tr>
            <th>S.No.</th>
            <th>Manway No.</th>
            <th>Name</th>
            <th>Phone No.</th>
            {userIsAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {employees.map(employee => (
            <tr key={employee.manway_no}>
              <td>{employee.serial_number}</td>
              <td>{employee.manway_no}</td>
              <td>{employee.name}</td>
              <td><a href={`tel:${employee.phone_no}`}>{employee.phone_no}</a></td>
              {userIsAdmin && (
                <td>
                  <button 
                    onClick={() => handleEdit(employee)}
                    style={{
                      padding: '5px 15px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeList;
