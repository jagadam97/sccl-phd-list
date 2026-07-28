import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';
import html2canvas from 'html2canvas';

interface Employee {
  manway_no: string;
  name: string;
  serial_number: number;
  is_active?: boolean;
}

interface AttendanceRecord {
  manway_no: string;
  date: string;
  present: boolean;
}

interface EligibilityRecord {
  manway_no: string;
  date: string;
  is_eligible: boolean;
}

interface PublicHoliday {
  date: string;
  description: string;
}

const MonthlyReport = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [otAttendance, setOtAttendance] = useState<AttendanceRecord[]>([]);
  const [lunchContinue, setLunchContinue] = useState<EligibilityRecord[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const startDate = format(startOfMonth(month), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(month), 'yyyy-MM-dd');

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('manway_no, name, serial_number, is_active')
        .order('serial_number', { ascending: true });

      // Fetch attendance for the month
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      // Fetch OT attendance for the month
      const { data: otAttendanceData, error: otAttendanceError } = await supabase
        .from('overtime_attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      // Fetch Lunch Continue eligibility for the month
      const { data: lunchContinueData, error: lunchContinueError } = await supabase
        .from('eligibility_status')
        .select('manway_no, date, is_eligible')
        .eq('type', 'lunch_continue')
        .gte('date', startDate)
        .lte('date', endDate);

      // Fetch public holidays for the month
      const { data: holidaysData, error: holidaysError } = await supabase
        .from('public_holidays')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
      }
      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
      }
      if (otAttendanceError) {
        console.error('Error fetching OT attendance:', otAttendanceError);
      }
      if (lunchContinueError) {
        console.error('Error fetching lunch continue eligibility:', lunchContinueError);
      }
      if (holidaysError) {
        console.error('Error fetching public holidays:', holidaysError);
      }

      const monthAttendance = attendanceData || [];
      const monthOtAttendance = otAttendanceData || [];
      const monthLunchContinue = lunchContinueData || [];

      // Show active employees, plus any inactive employee who has activity this month
      // (so a mid-month deactivation does not silently drop their records).
      const manwayNosWithActivity = new Set([
        ...monthAttendance.map(r => r.manway_no),
        ...monthOtAttendance.map(r => r.manway_no),
        ...monthLunchContinue.map(r => r.manway_no),
      ]);

      setEmployees(
        (employeesData || []).filter(
          emp => emp.is_active !== false || manwayNosWithActivity.has(emp.manway_no)
        )
      );
      setAttendance(monthAttendance);
      setOtAttendance(monthOtAttendance);
      setLunchContinue(monthLunchContinue);
      setPublicHolidays(holidaysData || []);

      setLoading(false);
    };

    fetchData();
  }, [month]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Value is 'yyyy-MM'; build the date locally to avoid time zone shifts
    const [year, monthNo] = e.target.value.split('-').map(Number);
    if (!year || !monthNo) return;
    setMonth(new Date(year, monthNo - 1, 1));
  };

  const isPublicHoliday = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return publicHolidays.some(holiday => holiday.date === dateStr);
  };

  const getAttendanceStatus = (manwayNo: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    const otRecord = otAttendance.find(
      a => a.manway_no === manwayNo && a.date === dateStr
    );

    if (otRecord && otRecord.present) {
      return <span style={{ color: 'purple' }}>OT</span>;
    }

    const record = attendance.find(
      a => a.manway_no === manwayNo && a.date === dateStr
    );

    if (!record) {
      return '-';
    }

    if (isPublicHoliday(date) && record.present) {
      return <span style={{ color: 'blue' }}>PHD</span>;
    }

    return record.present ? <span style={{ color: 'green' }}>✔</span> : <span style={{ color: 'red' }}>❌</span>;
  };

  // Total days present in the month (includes Sundays and public holidays)
  const getTotalDaysAttended = (manwayNo: string) => {
    return attendance.filter(
      record => record.manway_no === manwayNo && record.present
    ).length;
  };

  const getTotalOts = (manwayNo: string) => {
    return otAttendance.filter(
      record => record.manway_no === manwayNo && record.present
    ).length;
  };

  const getTotalLunchContinues = (manwayNo: string) => {
    return lunchContinue.filter(
      record => record.manway_no === manwayNo && record.is_eligible
    ).length;
  };

  // A PHD is a declared public holiday the employee was present for
  const getTotalPhds = (manwayNo: string) => {
    const holidayDates = new Set(publicHolidays.map(holiday => holiday.date));
    return attendance.filter(
      record => record.manway_no === manwayNo && record.present && holidayDates.has(record.date)
    ).length;
  };

  // A Play Day is a Sunday the employee was present for
  const getTotalPlays = (manwayNo: string) => {
    return attendance.filter(record => {
      if (record.manway_no !== manwayNo || !record.present) return false;
      const recordDate = new Date(record.date + 'T00:00:00');
      return recordDate.getDay() === 0;
    }).length;
  };

  const getTotalAttendanceForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendance.filter(
      record => record.date === dateStr && record.present
    ).length;
  };

  const sumColumn = (getter: (manwayNo: string) => number) => {
    return employees.reduce((total, employee) => total + getter(employee.manway_no), 0);
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
      link.download = `monthly-attendance-report-${format(monthStart, 'yyyy-MM')}.jpg`;
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

  const summaryHeaderStyle = { backgroundColor: '#f0f4ff' };
  const summaryCellStyle = { ...summaryHeaderStyle, fontWeight: 'bold' };

  // Only show the PHD column when the month actually has a declared public holiday
  const hasPublicHolidays = publicHolidays.length > 0;

  return (
    <div className="table-container">
      <div className="report-header">
        <h2>Monthly Attendance Report</h2>
        <button
          onClick={exportAsJPEG}
          disabled={exporting}
          className="export-button"
        >
          {exporting ? 'Exporting...' : 'Download'}
        </button>
      </div>
      <div className="date-picker-container">
        <label htmlFor="month-picker">Select Month: </label>
        <input
          type="month"
          id="month-picker"
          value={format(month, 'yyyy-MM')}
          onChange={handleMonthChange}
        />
      </div>
      <div ref={reportRef} style={{ backgroundColor: 'white', padding: '20px' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>
          Monthly Attendance Report ({format(monthStart, 'MMMM yyyy')})
        </h3>
        <table>
        <thead>
          <tr>
            <th>S.No.</th>
            <th>Manway No.</th>
            <th>Name</th>
            <th style={summaryHeaderStyle}>Days</th>
            <th style={summaryHeaderStyle}>OTs</th>
            <th style={summaryHeaderStyle}>Lunch Cont.</th>
            <th style={summaryHeaderStyle}>Plays</th>
            {hasPublicHolidays && <th style={summaryHeaderStyle}>PHDs</th>}
            {monthDays.map(day => (
              <th key={day.toString()}>{format(day, 'd')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map(employee => (
            <tr key={employee.manway_no}>
              <td>{employee.serial_number}</td>
              <td>{employee.manway_no}</td>
              <td>{employee.name}</td>
              <td style={summaryCellStyle}>{getTotalDaysAttended(employee.manway_no)}</td>
              <td style={summaryCellStyle}>{getTotalOts(employee.manway_no)}</td>
              <td style={summaryCellStyle}>{getTotalLunchContinues(employee.manway_no)}</td>
              <td style={summaryCellStyle}>{getTotalPlays(employee.manway_no)}</td>
              {hasPublicHolidays && <td style={summaryCellStyle}>{getTotalPhds(employee.manway_no)}</td>}
              {monthDays.map(day => (
                <td key={day.toString()} className="attendance-status">
                  {getAttendanceStatus(employee.manway_no, day)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="total-row" style={{ fontWeight: 'bold', borderTop: '2px solid #333' }}>
            <td></td>
            <td></td>
            <td>Total</td>
            <td style={summaryHeaderStyle}>{sumColumn(getTotalDaysAttended)}</td>
            <td style={summaryHeaderStyle}>{sumColumn(getTotalOts)}</td>
            <td style={summaryHeaderStyle}>{sumColumn(getTotalLunchContinues)}</td>
            <td style={summaryHeaderStyle}>{sumColumn(getTotalPlays)}</td>
            {hasPublicHolidays && <td style={summaryHeaderStyle}>{sumColumn(getTotalPhds)}</td>}
            {monthDays.map(day => (
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

export default MonthlyReport;
