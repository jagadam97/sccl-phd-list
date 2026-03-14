import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { auth } from '../firebase';

interface Employee {
  serial_number: number;
  manway_no: string;
  name: string;
  phone_no: string;
  is_active: boolean;
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
  const [showInactive, setShowInactive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Employee | null>(null);

  const userEmail = auth.currentUser?.email?.toLowerCase();
  const userIsAdmin = userEmail === 'jgireesa@gmail.com' || userEmail === 'dineshjagadam@gmail.com';

  useEffect(() => {
    fetchEmployees();
  }, [showInactive]);

  const fetchEmployees = async () => {
    setLoading(true);
    let query = supabase
      .from('employees')
      .select('*')
      .order('serial_number', { ascending: true });

    if (!showInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

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

  const handleDelete = async (employee: Employee, deactivate: boolean) => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ is_active: !deactivate })
        .eq('manway_no', employee.manway_no);

      if (updateError) {
        setError(`Error ${deactivate ? 'deactivating' : 'restoring'} employee: ${updateError.message}`);
      } else {
        setSuccess(`Employee ${deactivate ? 'deactivated' : 'restored'} successfully!`);
        setDeleteConfirm(null);
        await fetchEmployees();
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p>Loading employees...</p>;
  }

  return (
    <div className="table-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Employee List</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          <span>Show Inactive Employees</span>
        </label>
      </div>
      
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
                      cursor: 'pointer',
                      marginRight: '5px'
                    }}
                  >
                    Edit
                  </button>
                  {employee.is_active !== false ? (
                    <button
                      onClick={() => setDeleteConfirm(employee)}
                      style={{
                        padding: '5px 15px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(employee)}
                      style={{
                        padding: '5px 15px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Restore
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Delete/Restore Confirmation Modal */}
      {deleteConfirm && (
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
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>
              {deleteConfirm.is_active !== false ? 'Deactivate Employee?' : 'Restore Employee?'}
            </h3>
            <p>
              {deleteConfirm.is_active !== false
                ? `Are you sure you want to deactivate "${deleteConfirm.name}"? Their attendance history will be preserved.`
                : `Are you sure you want to restore "${deleteConfirm.name}"? They will appear in the active employee list.`
              }
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => handleDelete(deleteConfirm, deleteConfirm.is_active !== false)}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  backgroundColor: deleteConfirm.is_active !== false ? '#dc3545' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {deleteConfirm.is_active !== false ? 'Deactivate' : 'Restore'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
