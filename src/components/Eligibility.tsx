import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import html2canvas from 'html2canvas';

interface Employee {
  manway_no: string;
  name: string;
  serial_number: number;
}

const Eligibility: React.FC = () => {
  const [type, setType] = useState<'playday' | 'overtime' | 'phd'>('overtime');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [publicHolidays, setPublicHolidays] = useState<string[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setMessage('');
      setEmployees([]);
      setSelectedEmployees(new Set());
      
      let startSerial = 0;
      if (type === 'overtime' || type === 'phd') {
        const category = type === 'overtime' ? 'OT' : 'PHD';
        const { data: serialData, error: serialError } = await supabase
          .from('last_serials')
          .select('last_serial_number')
          .eq('category', category)
          .single();

        if (serialError) {
          console.error(`Error fetching ${category} serial:`, serialError);
        } else {
          startSerial = serialData.last_serial_number;
        }
      }
      
      const { data: allEmployees, error: employeesError } = await supabase
        .from('employees')
        .select('manway_no, name, serial_number')
        .order('serial_number', { ascending: true });

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        setLoading(false);
        return;
      }

      if (type === 'overtime') {
        const { data: presentEmployees, error: attendanceError } = await supabase
          .from('attendance')
          .select('manway_no')
          .eq('date', date)
          .eq('present', true);

        let eligibleEmployees = allEmployees;
        if (attendanceError) {
          console.error('Error fetching attendance for eligibility:', attendanceError);
        } else {
          const presentManwayNos = new Set(presentEmployees.map(emp => emp.manway_no));
          eligibleEmployees = allEmployees.filter(emp => presentManwayNos.has(emp.manway_no));
        }
        
        const nextSerial = startSerial + 1;
        const employeesAfterStart = eligibleEmployees.filter(emp => emp.serial_number >= nextSerial);
        const employeesBeforeStart = eligibleEmployees.filter(emp => emp.serial_number < nextSerial);
        const sortedEmployees = [...employeesAfterStart, ...employeesBeforeStart];
        setEmployees(sortedEmployees);

      } else if (type === 'phd') {
        const nextSerial = startSerial + 1;
        const employeesAfterStart = allEmployees.filter(emp => emp.serial_number >= nextSerial);
        const employeesBeforeStart = allEmployees.filter(emp => emp.serial_number < nextSerial);
        const sortedEmployees = [...employeesAfterStart, ...employeesBeforeStart];
        setEmployees(sortedEmployees);

      } else { // For playday
        setEmployees(allEmployees);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [type, date]);

  useEffect(() => {
    if (type === 'phd') {
      const fetchPublicHolidays = async () => {
        const { data, error } = await supabase
          .from('public_holidays')
          .select('date');
        
        if (!error && data) {
          setPublicHolidays(data.map(h => h.date));
        }
      };
      fetchPublicHolidays();
    }
  }, [type]);

  const handleCheckboxChange = (manwayNo: string) => {
    setSelectedEmployees(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(manwayNo)) {
        newSelection.delete(manwayNo);
      } else {
        newSelection.add(manwayNo);
      }
      return newSelection;
    });
  };

  const formatDate = (isoDate: string) => {
    if (!isoDate) return '';
    const dateParts = isoDate.split('-');
    if (dateParts.length !== 3) return isoDate;
    const [year, month, day] = dateParts;
    return `${day}-${month}-${year}`;
  };

  const handleDownloadReport = async () => {
    if (!reportRef.current) {
      setMessage('Report element not found.');
      return;
    }
    setMessage('Generating report...');
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.download = `${type.toUpperCase()}-Eligibility-${formatDate(date)}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage('Report downloaded successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      setMessage('Failed to generate report.');
    }
  };

  const getDateValidationMessage = () => {
    if (type === 'playday') {
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay();
      if (dayOfWeek !== 0) {
        return '⚠️ PlayDay eligibility is typically for Sundays.';
      }
    }
    
    if (type === 'phd' && !publicHolidays.includes(date)) {
      return '⚠️ This date is not a declared public holiday.';
    }
    
    return null;
  };

  const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Eligibility`;
  const reportEmployees = employees.filter(emp => selectedEmployees.has(emp.manway_no));

  return (
    <div className="dashboard">
      <h2>Eligibility Report</h2>
      <div className="controls-container">
        <div className="report-type-container">
          <label htmlFor="eligibility-type">Type: </label>
          <select
            id="eligibility-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'playday' | 'overtime' | 'phd')}
          >
            <option value="overtime">Overtime</option>
            <option value="phd">PHD</option>
            <option value="playday">Play Day</option>
          </select>
        </div>
        <div className="date-picker-container">
          <label htmlFor="attendance-date">Select Date: </label>
          <input
            type="date"
            id="attendance-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      {getDateValidationMessage() && (
        <div className="validation-message">
          {getDateValidationMessage()}
        </div>
      )}

      {loading && <p>Loading employees...</p>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>S.No.</th>
              <th style={{ textAlign: 'left' }}>Manway No.</th>
              <th style={{ textAlign: 'left' }}>Name</th>
              <th style={{ textAlign: 'left' }}>Eligible</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => (
              <tr key={employee.manway_no}>
                <td style={{ textAlign: 'left' }}>{employee.serial_number}</td>
                <td style={{ textAlign: 'left' }}>{employee.manway_no}</td>
                <td style={{ textAlign: 'left' }}>{employee.name}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedEmployees.has(employee.manway_no)}
                    onChange={() => handleCheckboxChange(employee.manway_no)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id="report-content" ref={reportRef} style={{ padding: '20px', backgroundColor: 'white', display: 'inline-block' }}>
          <h3 style={{ textAlign: 'center' }}>{title}</h3>
          <p style={{ textAlign: 'center' }}>Date: {formatDate(date)}</p>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>S.No.</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Manway No.</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Name</th>
              </tr>
            </thead>
            <tbody>
              {reportEmployees.map(employee => (
                <tr key={employee.manway_no}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{employee.serial_number}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{employee.manway_no}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{employee.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <button onClick={handleDownloadReport} disabled={loading || selectedEmployees.size === 0}>
        {loading ? 'Loading...' : 'Download Report'}
      </button>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default Eligibility;
