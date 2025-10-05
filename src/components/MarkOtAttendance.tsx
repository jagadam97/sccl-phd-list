import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface Employee {
  manway_no: string;
  name: string;
  serial_number: number;
}

const MarkOtAttendance = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Set<string>>(new Set());
  const [otCounts, setOtCounts] = useState<Record<string, number>>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchAttendanceForDate = async () => {
      if (!date) return;

      setLoading(true);

      // Fetch all employees
      const { data: allEmployees, error: employeesError } = await supabase
        .from('employees')
        .select('manway_no, name, serial_number')
        .order('serial_number', { ascending: true });

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        setLoading(false);
        return;
      }

      // Fetch regular attendance for the selected date
      const { data: presentData, error: presentError } = await supabase
        .from('attendance')
        .select('manway_no')
        .eq('date', date)
        .eq('present', true);

      if (presentError) {
        console.error('Error fetching regular attendance:', presentError);
        setEmployees([]);
      } else {
        const presentManwayNos = new Set(presentData.map(a => a.manway_no));
        const presentEmployees = allEmployees.filter(emp => presentManwayNos.has(emp.manway_no));
        setEmployees(presentEmployees);
      }

      // Fetch OT attendance for the selected date
      const { data, error } = await supabase
        .from('overtime_attendance')
        .select('manway_no')
        .eq('date', date)
        .eq('present', true);

      if (error) {
        console.error('Error fetching OT attendance:', error);
      } else {
        const presentIds = new Set(data.map(a => a.manway_no));
        setAttendance(presentIds);
      }

      // Fetch and calculate monthly OT counts
      const selectedDate = new Date(date);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      
      const monthStartDate = new Date(year, month, 1).toISOString().split('T')[0];
      const monthEndDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data: monthOtAttendance, error: monthOtAttendanceError } = await supabase
        .from('overtime_attendance')
        .select('manway_no, present')
        .gte('date', monthStartDate)
        .lte('date', monthEndDate);

      if (monthOtAttendanceError) {
        console.error('Error fetching month OT attendance for OT counts:', monthOtAttendanceError);
      } else {
        const counts: Record<string, number> = {};
        for (const record of monthOtAttendance) {
          if (record.present) {
            counts[record.manway_no] = (counts[record.manway_no] || 0) + 1;
          }
        }
        setOtCounts(counts);
      }
      setLoading(false);
    };

    fetchAttendanceForDate();
  }, [date]);

  const handleCheckboxChange = (manwayNo: string) => {
    setAttendance(prev => {
      const newAttendance = new Set(prev);
      if (newAttendance.has(manwayNo)) {
        newAttendance.delete(manwayNo);
      } else {
        newAttendance.add(manwayNo);
      }
      return newAttendance;
    });
  };

  const handleSaveAttendance = async () => {
    setMessage('');
    if (!date) {
      setMessage('Please select a date.');
      return;
    }

    const records = employees.map(emp => ({
      manway_no: emp.manway_no,
      date: date,
      present: attendance.has(emp.manway_no)
    }));

    try {
      const { error } = await supabase
        .from('overtime_attendance')
        .upsert(records, { onConflict: 'manway_no,date' });

      if (error) throw error;

      setMessage('OT Attendance saved successfully!');
    } catch (error) {
      setMessage('Error saving OT attendance. Please try again.');
      console.error('Error saving OT attendance:', error);
    }
  };

  if (loading) {
    return <p>Loading employees...</p>;
  }

  return (
    <div className="dashboard">
      <h2>Mark OT Attendance</h2>
      <div className="date-picker-container">
        <label htmlFor="attendance-date">Select Date: </label>
        <input
          type="date"
          id="attendance-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="employee-attendance-list">
        {employees.map((employee) => (
          <div key={employee.manway_no} className="employee-attendance-item">
            <span>{employee.serial_number}. {employee.name} ({otCounts[employee.manway_no] || 0})</span>
            <input
              type="checkbox"
              checked={attendance.has(employee.manway_no)}
              onChange={() => handleCheckboxChange(employee.manway_no)}
            />
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', margin: '1rem 0' }}>
        Total Present: {attendance.size}
      </div>
      <button onClick={handleSaveAttendance}>Save OT Attendance</button>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default MarkOtAttendance;
