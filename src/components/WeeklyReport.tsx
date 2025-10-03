import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import html2canvas from 'html2canvas';

interface Employee {
  manway_no: string;
  name: string;
  serial_number: number;
}

interface AttendanceRecord {
  manway_no: string;
  date: string;
  present: boolean;
}

interface PublicHoliday {
  date: string;
  description: string;
}

const WeeklyReport = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [week, setWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(week, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const currentWeekStart = startOfWeek(week, { weekStartsOn: 1 });
      const currentWeekEnd = endOfWeek(week, { weekStartsOn: 1 });

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('manway_no, name, serial_number')
        .order('serial_number', { ascending: true });

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
      } else {
        setEmployees(employeesData);
      }

      // Fetch attendance for the week
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', format(currentWeekStart, 'yyyy-MM-dd'))
        .lte('date', format(currentWeekEnd, 'yyyy-MM-dd'));

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
      } else {
        setAttendance(attendanceData);
      }

      // Fetch public holidays for the week
      const { data: holidaysData, error: holidaysError } = await supabase
        .from('public_holidays')
        .select('*')
        .gte('date', format(currentWeekStart, 'yyyy-MM-dd'))
        .lte('date', format(currentWeekEnd, 'yyyy-MM-dd'));

      if (holidaysError) {
        console.error('Error fetching public holidays:', holidaysError);
      } else {
        setPublicHolidays(holidaysData);
      }

      setLoading(false);
    };

    fetchData();
  }, [week]);

  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Add time zone offset to prevent date from shifting
    const selectedDate = new Date(e.target.value);
    const timeZoneOffset = selectedDate.getTimezoneOffset() * 60000;
    setWeek(new Date(selectedDate.getTime() + timeZoneOffset));
  };

  const isPublicHoliday = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return publicHolidays.some(holiday => holiday.date === dateStr);
  };

  const getAttendanceStatus = (manwayNo: string, date: Date) => {
    const record = attendance.find(
      a => a.manway_no === manwayNo && a.date === format(date, 'yyyy-MM-dd')
    );
    
    if (!record) {
      return '-';
    }
    
    // If the date is a public holiday and person is present, show PHD
    if (isPublicHoliday(date) && record.present) {
      return <span style={{ color: 'blue' }}>PHD</span>;
    }
    
    // For all other cases: present gets ✔, absent gets ❌ (red cross)
    return record.present ? <span style={{ color: 'green' }}>✔</span> : <span style={{ color: 'red' }}>❌</span>;
  };

  const getTotalAttendanceForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendance.filter(
      record => record.date === dateStr && record.present
    ).length;
  };

  const exportAsJPEG = async () => {
    if (!reportRef.current) return;
    
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: false
      });
      
      // Convert to JPEG
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      // Create download link
      const link = document.createElement('a');
      link.download = `weekly-attendance-report-${format(weekStart, 'yyyy-MM-dd')}.jpg`;
      link.href = jpegDataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <p>Loading report...</p>;
  }

  return (
    <div className="table-container">
      <div className="report-header">
        <h2>Weekly Attendance Report</h2>
        <button 
          onClick={exportAsJPEG}
          disabled={exporting}
          className="export-button"
        >
          {exporting ? 'Exporting...' : 'Export as JPEG'}
        </button>
      </div>
      <div className="date-picker-container">
        <label htmlFor="week-picker">Select Day in Week: </label>
        <input
          type="date"
          id="week-picker"
          value={format(week, 'yyyy-MM-dd')}
          onChange={handleWeekChange}
        />
      </div>
      <div ref={reportRef} style={{ backgroundColor: 'white', padding: '20px' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>
          Weekly Attendance Report ({format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')})
        </h3>
        <table>
        <thead>
          <tr>
            <th>S.No.</th>
            <th>Name</th>
            {weekDays.map(day => (
              <th key={day.toString()}>{format(day, 'EEE dd')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map(employee => (
            <tr key={employee.manway_no}>
              <td>{employee.serial_number}</td>
              <td>{employee.name}</td>
              {weekDays.map(day => (
                <td key={day.toString()} className="attendance-status">
                  {getAttendanceStatus(employee.manway_no, day)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="total-row" style={{ fontWeight: 'bold', borderTop: '2px solid #333' }}>
            <td></td>
            <td>Total</td>
            {weekDays.map(day => (
              <td key={day.toString()} className="attendance-status">
                {getTotalAttendanceForDay(day)}
              </td>
            ))}
          </tr>
        </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeeklyReport;
