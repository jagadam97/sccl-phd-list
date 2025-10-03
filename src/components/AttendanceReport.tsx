import React, { useState } from 'react';
import { supabase } from '../supabase';

interface Employee {
  manway_no: string;
  name: string;
  serial_number: number;
}

interface ReportRecord extends Employee {
  present: boolean;
}

const AttendanceReport: React.FC = () => {
  const [reportData, setReportData] = useState<ReportRecord[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'playday' | 'phd' | 'overtime'>('playday');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const tableNameMap = {
    playday: 'playday_attendance',
    phd: 'phd_attendance',
    overtime: 'overtime_attendance',
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage('');
    setReportData([]);

    const tableName = tableNameMap[reportType];

    // Fetch attendance for the selected date and type
    const { data: attendanceData, error: attendanceError } = await supabase
      .from(tableName)
      .select('manway_no, present')
      .eq('date', date)
      .eq('present', true);

    if (attendanceError) {
      console.error('Error fetching attendance data:', attendanceError);
      setMessage('Error fetching report data.');
      setLoading(false);
      return;
    }

    if (attendanceData.length === 0) {
      setMessage('No attendance records found for the selected date and type.');
      setLoading(false);
      return;
    }

    const presentManwayNos = attendanceData.map(a => a.manway_no);

    // Fetch employee details for those who were present
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('manway_no, name, serial_number')
      .in('manway_no', presentManwayNos);

    if (employeeError) {
      console.error('Error fetching employee details:', employeeError);
      setMessage('Error fetching employee details.');
      setLoading(false);
      return;
    }

    // Combine data for the report
    const report = employeeData.map(emp => ({
      ...emp,
      present: true,
    })).sort((a, b) => a.serial_number - b.serial_number);

    setReportData(report);
    setLoading(false);
  };

  const formatDate = (isoDate: string) => {
    if (!isoDate) return '';
    const dateParts = isoDate.split('-');
    if (dateParts.length !== 3) return isoDate;
    const [year, month, day] = dateParts;
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="dashboard">
      <h2>Attendance Report</h2>
      <div className="report-controls">
        <div className="date-picker-container">
          <label htmlFor="report-date">Select Date: </label>
          <input
            type="date"
            id="report-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="report-type-container">
          <label htmlFor="report-type">Report Type: </label>
          <select
            id="report-type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as 'playday' | 'phd' | 'overtime')}
          >
            <option value="playday">Play Day</option>
            <option value="phd">PHD</option>
            <option value="overtime">Overtime</option>
          </select>
        </div>
        <button onClick={handleGenerateReport} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {message && <p className="message">{message}</p>}

      {reportData.length > 0 && (
        <div className="report-results">
          <h3>Report for {reportType.charAt(0).toUpperCase() + reportType.slice(1)} on {formatDate(date)}</h3>
          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', margin: '1rem 0' }}>
            Total Present: {reportData.length}
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>S.No.</th>
                  <th style={{ textAlign: 'left' }}>Manway No.</th>
                  <th style={{ textAlign: 'left' }}>Name</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(record => (
                  <tr key={record.manway_no}>
                    <td style={{ textAlign: 'left' }}>{record.serial_number}</td>
                    <td style={{ textAlign: 'left' }}>{record.manway_no}</td>
                    <td style={{ textAlign: 'left' }}>{record.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;
