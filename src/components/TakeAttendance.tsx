import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface Employee {
  manway_no: string;
  name: string;
  serial_number: number;
}

const TakeAttendance = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Set<string>>(new Set());
  const [initialAttendance, setInitialAttendance] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [publicHolidays, setPublicHolidays] = useState<string[]>([]);
  const [phdSerialStart, setPhdSerialStart] = useState<number>(0);
  const [playdaySerialStart, setPlaydaySerialStart] = useState<number>(0);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      
      // Fetch all employees
      const { data: allEmployees, error } = await supabase
        .from('employees')
        .select('manway_no, name, serial_number')
        .order('serial_number', { ascending: true });

      if (error) {
        console.error('Error fetching employees:', error);
        setLoading(false);
        return;
      }

      // Check date type and apply circular ordering
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay();
      
      if (publicHolidays.includes(date)) {
        // PHD day - Apply circular ordering: start from PHD tracker + 1, then wrap around
        const nextSerial = phdSerialStart + 1;
        const employeesAfterStart = allEmployees.filter(emp => emp.serial_number >= nextSerial);
        const employeesBeforeStart = allEmployees.filter(emp => emp.serial_number < nextSerial);
        
        // Combine: employees from nextSerial to end, then employees from 1 to phdSerialStart
        const orderedEmployees = [...employeesAfterStart, ...employeesBeforeStart];
        setEmployees(orderedEmployees);
      } else if (dayOfWeek === 0) {
        // PlayDay (Sunday) - Apply circular ordering: start from PlayDay tracker + 1, then wrap around
        const nextSerial = playdaySerialStart + 1;
        const employeesAfterStart = allEmployees.filter(emp => emp.serial_number >= nextSerial);
        const employeesBeforeStart = allEmployees.filter(emp => emp.serial_number < nextSerial);
        
        // Combine: employees from nextSerial to end, then employees from 1 to playdaySerialStart
        const orderedEmployees = [...employeesAfterStart, ...employeesBeforeStart];
        setEmployees(orderedEmployees);
      } else {
        setEmployees(allEmployees);
      }
      
      setLoading(false);
    };

    if (publicHolidays.length > 0) { // Only run when holidays are loaded
      fetchEmployees();
    }
  }, [date, publicHolidays, phdSerialStart, playdaySerialStart]);

  useEffect(() => {
    // Fetch public holidays and serial trackers
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('public_holidays')
        .select('date');
      
      if (!error && data) {
        setPublicHolidays(data.map(h => h.date));
      }

      // Fetch PHD serial tracker
      const { data: phdSerialData, error: phdSerialError } = await supabase
        .from('last_serials')
        .select('last_serial_number')
        .eq('category', 'PHD')
        .single();

      if (phdSerialError) {
        console.error('Error fetching PHD serial:', phdSerialError);
      } else {
        setPhdSerialStart(phdSerialData.last_serial_number);
      }

      // Fetch PlayDay serial tracker
      const { data: playdaySerialData, error: playdaySerialError } = await supabase
        .from('last_serials')
        .select('last_serial_number')
        .eq('category', 'PlayDay')
        .single();

      if (playdaySerialError) {
        console.error('Error fetching PlayDay serial:', playdaySerialError);
      } else {
        setPlaydaySerialStart(playdaySerialData.last_serial_number);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchAttendanceForDate = async () => {
      if (!date) return;
      const { data, error } = await supabase
        .from('attendance')
        .select('manway_no')
        .eq('date', date)
        .eq('present', true);

      if (error) {
        console.error('Error fetching attendance:', error);
      } else {
        const presentIds = new Set(data.map(a => a.manway_no));
        setAttendance(presentIds);
        setInitialAttendance(presentIds);
      }
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

    // Records to be inserted/updated
    const records = employees.map(emp => ({
      manway_no: emp.manway_no,
      date: date,
      present: attendance.has(emp.manway_no)
    }));

    try {
      // Always save to regular attendance
      const { error: attendanceError } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'manway_no,date' });

      if (attendanceError) throw attendanceError;

      // On successful save, update the initial attendance state
      setInitialAttendance(new Set(attendance));

      // Check if it's a Sunday (PlayDay)
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay();
      
      if (dayOfWeek === 0) {
        // It's Sunday - also save to playday_attendance
        const { error: playdayError } = await supabase
          .from('playday_attendance')
          .upsert(records, { onConflict: 'manway_no,date' });
        
        if (playdayError) throw playdayError;

        // Update PlayDay tracker with the last employee who got PlayDay assignment
        const employeesWithPlayDay = employees.filter(emp => attendance.has(emp.manway_no));
        
        if (employeesWithPlayDay.length > 0) {
          // Get the last employee in the circular order who got PlayDay
          const lastPlayDayEmployee = employeesWithPlayDay[employeesWithPlayDay.length - 1];
          
          // Update the PlayDay serial tracker
          const { error: trackerError } = await supabase
            .from('last_serials')
            .update({ last_serial_number: lastPlayDayEmployee.serial_number })
            .eq('category', 'PlayDay');

          if (trackerError) {
            console.error('Error updating PlayDay tracker:', trackerError);
            setMessage('Attendance saved successfully! (PlayDay detected - saved to both regular and PlayDay tables, but failed to update PlayDay tracker)');
          } else {
            setMessage(`Attendance saved successfully! (PlayDay detected - saved to both regular and PlayDay tables, PlayDay tracker updated to ${lastPlayDayEmployee.serial_number})`);
          }
        } else {
          setMessage('Attendance saved successfully! (PlayDay detected - saved to both regular and PlayDay tables)');
        }
      } else {
        // Check if it's a public holiday (PHD)
        const { data: holidayData, error: holidayError } = await supabase
          .from('public_holidays')
          .select('date')
          .eq('date', date)
          .single();

        if (holidayError && holidayError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is OK
          throw holidayError;
        }

        if (holidayData) {
          // It's a public holiday - also save to phd_attendance
          const { error: phdError } = await supabase
            .from('phd_attendance')
            .upsert(records, { onConflict: 'manway_no,date' });
          
          if (phdError) throw phdError;

          // Update PHD tracker with the last employee who got PHD assignment
          const employeesWithPHD = employees.filter(emp => attendance.has(emp.manway_no));
          
          if (employeesWithPHD.length > 0) {
            // Get the last employee in the circular order who got PHD
            const lastPHDEmployee = employeesWithPHD[employeesWithPHD.length - 1];
            
            // Update the PHD serial tracker
            const { error: trackerError } = await supabase
              .from('last_serials')
              .update({ last_serial_number: lastPHDEmployee.serial_number })
              .eq('category', 'PHD');

            if (trackerError) {
              console.error('Error updating PHD tracker:', trackerError);
              setMessage('Attendance saved successfully! (Public Holiday detected - saved to both regular and PHD tables, but failed to update PHD tracker)');
            } else {
              setMessage(`Attendance saved successfully! (Public Holiday detected - saved to both regular and PHD tables, PHD tracker updated to ${lastPHDEmployee.serial_number})`);
            }
          } else {
            setMessage('Attendance saved successfully! (Public Holiday detected - saved to both regular and PHD tables)');
          }
        } else {
          setMessage('Attendance saved successfully!');
        }
      }
    } catch (error) {
      setMessage('Error saving attendance. Please try again.');
      console.error('Error saving attendance:', error);
    }
  };

  if (loading) {
    return <p>Loading employees...</p>;
  }

  const getDateTypeInfo = () => {
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();
    
    if (dayOfWeek === 0) {
      return { type: 'PlayDay', message: '🎮 Sunday - PlayDay attendance will be recorded', color: '#17a2b8' };
    }
    
    if (publicHolidays.includes(date)) {
      return { type: 'PHD', message: '🏛️ Public Holiday - PHD attendance will be recorded', color: '#dc3545' };
    }
    
    return { type: 'Regular', message: '📅 Regular attendance', color: '#28a745' };
  };

  const dateInfo = getDateTypeInfo();

  const getCheckboxStyle = (manwayNo: string) => {
    const isPresent = attendance.has(manwayNo);
    const wasInitiallyPresent = initialAttendance.has(manwayNo);

    if (isPresent && wasInitiallyPresent) {
      return { accentColor: 'blue' };
    }
    
    return { accentColor: 'black' };
  };

  return (
    <div className="dashboard">
      <h2>Take Attendance</h2>
      <div className="date-picker-container">
        <label htmlFor="attendance-date">Select Date: </label>
        <input
          type="date"
          id="attendance-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="date-type-info" style={{ backgroundColor: `${dateInfo.color}20`, color: dateInfo.color, padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
        {dateInfo.message}
      </div>
      <div className="employee-attendance-list">
        {employees.map((employee) => (
          <div key={employee.manway_no} className="employee-attendance-item">
            <span>{employee.serial_number}. {employee.name}</span>
            <input
              type="checkbox"
              style={getCheckboxStyle(employee.manway_no)}
              checked={attendance.has(employee.manway_no)}
              onChange={() => handleCheckboxChange(employee.manway_no)}
            />
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', margin: '1rem 0' }}>
        Total Present: {attendance.size}
      </div>
      <button onClick={handleSaveAttendance}>Save Attendance</button>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default TakeAttendance;
