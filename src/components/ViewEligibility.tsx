import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import html2canvas from 'html2canvas';

interface Employee {
  manway_no: string;
  name: string;
  serial_number: number;
}

const ViewEligibility: React.FC = () => {
  const [type, setType] = useState<'playday' | 'overtime' | 'phd'>('overtime');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setMessage('');
      
      const { data: allEmployeesData, error: employeesError } = await supabase
        .from('employees')
        .select('manway_no, name, serial_number')
        .order('serial_number', { ascending: true });

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        setLoading(false);
        return;
      }
      
      setAllEmployees(allEmployeesData);

      const { data: eligibilityData, error: eligibilityError } = await supabase
        .from('eligibility_status')
        .select('manway_no, is_eligible')
        .eq('date', date)
        .eq('type', type);

      if (eligibilityError) {
        console.error('Error fetching eligibility status:', eligibilityError);
        setEmployees([]);
      } else {
        const eligibleManwayNos = new Set(
          eligibilityData.filter(e => e.is_eligible).map(e => e.manway_no)
        );
        const eligibleEmployees = allEmployeesData.filter(emp => eligibleManwayNos.has(emp.manway_no));
        setEmployees(eligibleEmployees);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [type, date]);

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

  const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Eligibility`;

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

      {loading && <p>Loading employees...</p>}

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
            {employees.map((employee, index) => (
              <tr key={employee.manway_no}>
                <td style={{ textAlign: 'left' }}>{index + 1}</td>
                <td style={{ textAlign: 'left' }}>{employee.manway_no}</td>
                <td style={{ textAlign: 'left' }}>{employee.name}</td>
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
              {employees.map((employee, index) => (
                <tr key={employee.manway_no}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{index + 1}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{employee.manway_no}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{employee.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <button onClick={handleDownloadReport} disabled={loading || employees.length === 0}>
        {loading ? 'Loading...' : 'Download Report'}
      </button>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default ViewEligibility;
