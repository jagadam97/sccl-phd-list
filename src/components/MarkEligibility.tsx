import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import html2canvas from 'html2canvas';

interface Employee {
  manway_no: string;
  name: string;
  serial_number: number;
}

interface EligibilityProps {
  userIsAdmin: boolean;
}

const MarkEligibility: React.FC<EligibilityProps> = ({ userIsAdmin }) => {
  const [type, setType] = useState<'playday' | 'overtime' | 'phd'>('overtime');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [swappedEmployees, setSwappedEmployees] = useState<Record<string, Employee | null>>({});
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [employeeToSwap, setEmployeeToSwap] = useState<Employee | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [publicHolidays, setPublicHolidays] = useState<string[]>([]);
  const [playdayCounts, setPlaydayCounts] = useState<Record<string, number>>({});
  const [phdCounts, setPhdCounts] = useState<Record<string, number>>({});
  const [playDayEligible, setPlayDayEligible] = useState<string[]>([]);
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
      } else {
        const eligibleManwayNos = new Set(
          eligibilityData.filter(e => e.is_eligible).map(e => e.manway_no)
        );
        setSelectedEmployees(eligibleManwayNos);
      }

      const { data: swapData, error: swapError } = await supabase
        .from('swaps')
        .select('original_manway_no, replacement_manway_no')
        .eq('date', date)
        .eq('type', type);

      if (swapError) {
        console.error('Error fetching swaps:', swapError);
      } else {
        const swaps: Record<string, Employee | null> = {};
        for (const swap of swapData) {
          const replacement = allEmployeesData.find(emp => emp.manway_no === swap.replacement_manway_no);
          swaps[swap.original_manway_no] = replacement || null;
        }
        setSwappedEmployees(swaps);
      }

      if (type === 'playday') {
        const selectedDate = new Date(date);
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        
        const monthStartDate = new Date(year, month, 1).toISOString().split('T')[0];
        const monthEndDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

        const { data: monthAttendance, error: monthAttendanceError } = await supabase
          .from('attendance')
          .select('manway_no, date, present')
          .gte('date', monthStartDate)
          .lte('date', monthEndDate);

        if (monthAttendanceError) {
          console.error('Error fetching month attendance for playday counts:', monthAttendanceError);
        } else {
          const counts: Record<string, number> = {};
          for (const record of monthAttendance) {
            const recordDate = new Date(record.date + 'T00:00:00');
            if (record.present && recordDate.getUTCDay() === 0) {
              counts[record.manway_no] = (counts[record.manway_no] || 0) + 1;
            }
          }
          setPlaydayCounts(counts);
        }
      } else {
        setPlaydayCounts({});
      }

      if (type === 'phd') {
        const currentYear = new Date(date).getFullYear();
        const yearStartDate = `${currentYear}-01-01`;
        const yearEndDate = `${currentYear}-12-31`;

        const { data: yearPublicHolidays, error: publicHolidaysError } = await supabase
          .from('public_holidays')
          .select('date')
          .gte('date', yearStartDate)
          .lte('date', yearEndDate);

        if (publicHolidaysError) {
          console.error('Error fetching public holidays for PHD counts:', publicHolidaysError);
        } else {
          const holidayDates = yearPublicHolidays.map(h => h.date);
          const { data: holidayAttendance, error: holidayAttendanceError } = await supabase
            .from('attendance')
            .select('manway_no, present')
            .in('date', holidayDates)
            .eq('present', true);

          if (holidayAttendanceError) {
            console.error('Error fetching holiday attendance for PHD counts:', holidayAttendanceError);
          } else {
            const counts: Record<string, number> = {};
            for (const record of holidayAttendance) {
              counts[record.manway_no] = (counts[record.manway_no] || 0) + 1;
            }
            setPhdCounts(counts);
          }
        }
      } else {
        setPhdCounts({});
      }

      if (type === 'overtime') {
        const { data: presentEmployees, error: attendanceError } = await supabase
          .from('attendance')
          .select('manway_no')
          .eq('date', date)
          .eq('present', true);

        let eligibleEmployees = allEmployeesData;
        if (attendanceError) {
          console.error('Error fetching attendance for eligibility:', attendanceError);
        } else {
          const presentManwayNos = new Set(presentEmployees.map(emp => emp.manway_no));
          eligibleEmployees = allEmployeesData.filter(emp => presentManwayNos.has(emp.manway_no));
        }
        
        const nextSerial = startSerial + 1;
        const employeesAfterStart = eligibleEmployees.filter(emp => emp.serial_number >= nextSerial);
        const employeesBeforeStart = eligibleEmployees.filter(emp => emp.serial_number < nextSerial);
        const sortedEmployees = [...employeesAfterStart, ...employeesBeforeStart];
        setEmployees(sortedEmployees);

      } else if (type === 'phd') {
        const nextSerial = startSerial + 1;
        const employeesAfterStart = allEmployeesData.filter(emp => emp.serial_number >= nextSerial);
        const employeesBeforeStart = allEmployeesData.filter(emp => emp.serial_number < nextSerial);
        const sortedEmployees = [...employeesAfterStart, ...employeesBeforeStart];
        setEmployees(sortedEmployees);

      } else if (type === 'playday') {
        const selectedDate = new Date(date);
        const dayOfWeek = selectedDate.getUTCDay();

        if (dayOfWeek === 0) { // Sunday
          const previousSaturday = new Date(selectedDate);
          previousSaturday.setUTCDate(selectedDate.getUTCDate() - 1);

          const previousMonday = new Date(previousSaturday);
          previousMonday.setUTCDate(previousSaturday.getUTCDate() - 5);

          const startDate = previousMonday.toISOString().split('T')[0];
          const endDate = previousSaturday.toISOString().split('T')[0];

          const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance')
            .select('manway_no, present, date')
            .gte('date', startDate)
            .lte('date', endDate);

          const { data: holidaysData, error: holidaysError } = await supabase
            .from('public_holidays')
            .select('date')
            .gte('date', startDate)
            .lte('date', endDate);

          if (attendanceError || holidaysError) {
            console.error('Error fetching data for playday:', attendanceError || holidaysError);
            setEmployees([]);
          } else {
            const holidayDates = new Set(holidaysData.map(h => h.date));
            
            const attendanceByUser = allEmployeesData.reduce((acc, emp) => {
              acc[emp.manway_no] = new Set<string>();
              return acc;
            }, {} as Record<string, Set<string>>);

            // Add actual attendance
            attendanceData.forEach(record => {
              if (record.present) {
                attendanceByUser[record.manway_no]?.add(record.date);
              }
            });

            // Add public holidays as attendance for everyone
            holidayDates.forEach(hDate => {
              for (const manwayNo in attendanceByUser) {
                attendanceByUser[manwayNo].add(hDate);
              }
            });

            const eligibleManwayNos = Object.keys(attendanceByUser).filter(manwayNo => attendanceByUser[manwayNo].size >= 4);
            const eligibleEmployees = allEmployeesData.filter(emp => eligibleManwayNos.includes(emp.manway_no));
            setEmployees(eligibleEmployees);
            setPlayDayEligible(eligibleManwayNos);
          }
        } else {
          setEmployees([]);
          setPlayDayEligible([]);
        }
      } else {
        setEmployees(allEmployeesData);
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
    if (!userIsAdmin) return;
    const newSelection = new Set(selectedEmployees);
    if (newSelection.has(manwayNo)) {
      newSelection.delete(manwayNo);
    } else {
      newSelection.add(manwayNo);
    }
    setSelectedEmployees(newSelection);
  };

  const openSwapModal = (employee: Employee) => {
    setEmployeeToSwap(employee);
    setIsSwapModalOpen(true);
  };

  const closeSwapModal = () => {
    setEmployeeToSwap(null);
    setIsSwapModalOpen(false);
  };

  const handleSwap = (replacementEmployee: Employee) => {
    if (employeeToSwap) {
      setSwappedEmployees(prev => ({
        ...prev,
        [employeeToSwap.manway_no]: replacementEmployee,
      }));
    }
    closeSwapModal();
  };

  const handleResetSwap = (originalManwayNo: string) => {
    setSwappedEmployees(prev => {
      const newSwaps = { ...prev };
      delete newSwaps[originalManwayNo];
      return newSwaps;
    });
  };

  const formatDate = (isoDate: string) => {
    if (!isoDate) return '';
    const dateParts = isoDate.split('-');
    if (dateParts.length !== 3) return isoDate;
    const [year, month, day] = dateParts;
    return `${day}-${month}-${year}`;
  };

  const handleSaveAndDownload = async () => {
    setMessage('Saving changes...');
    
    // Clear existing records for the day and type
    const { error: deleteEligibilityError } = await supabase
      .from('eligibility_status')
      .delete()
      .eq('date', date)
      .eq('type', type);

    const { error: deleteSwapsError } = await supabase
      .from('swaps')
      .delete()
      .eq('date', date)
      .eq('type', type);

    if (deleteEligibilityError || deleteSwapsError) {
      setMessage('Error clearing old data. Please try again.');
      console.error('Error clearing data:', deleteEligibilityError || deleteSwapsError);
      return;
    }

    // Insert new eligibility records
    const eligibilityToInsert = Array.from(selectedEmployees).map(manway_no => ({
      manway_no,
      date,
      type,
      is_eligible: true,
    }));

    const { error: insertEligibilityError } = await supabase
      .from('eligibility_status')
      .insert(eligibilityToInsert);

    if (insertEligibilityError) {
      setMessage('Error saving eligibility. Please try again.');
      console.error('Error saving eligibility:', insertEligibilityError);
      return;
    }

    // Insert new swap records
    const swapsToInsert = Object.entries(swappedEmployees)
      .filter(([, replacement]) => replacement)
      .map(([original_manway_no, replacement]) => ({
        date,
        type,
        original_manway_no,
        replacement_manway_no: replacement!.manway_no,
      }));

    if (swapsToInsert.length > 0) {
      const { error: insertSwapsError } = await supabase
        .from('swaps')
        .insert(swapsToInsert);

      if (insertSwapsError) {
        setMessage('Error saving swaps. Please try again.');
        console.error('Error saving swaps:', insertSwapsError);
        return;
      }
    }
    
    setMessage('Changes saved. Generating report...');
    await handleDownloadReport();
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

  const getAvailableForSwap = () => {
    if (!employeeToSwap) return [];

    const involvedManwayNos = new Set<string>();
    for (const key in swappedEmployees) {
        if (key !== employeeToSwap.manway_no) {
            involvedManwayNos.add(key);
            const replacement = swappedEmployees[key];
            if (replacement) {
                involvedManwayNos.add(replacement.manway_no);
            }
        }
    }

    let available = allEmployees;
    if (type === 'playday') {
      available = allEmployees.filter(emp => playDayEligible.includes(emp.manway_no));
    }

    return available.filter(emp => {
        if (emp.manway_no === employeeToSwap.manway_no) {
            return false;
        }
        if (involvedManwayNos.has(emp.manway_no)) {
            return false;
        }
        if (selectedEmployees.has(emp.manway_no)) {
            return false;
        }
        return true;
    });
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
              {(type === 'phd' || type === 'playday') && <th style={{ textAlign: 'left' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {employees
              .filter(employee => !Object.values(swappedEmployees).some(swapped => swapped?.manway_no === employee.manway_no))
              .filter(employee => userIsAdmin || selectedEmployees.has(employee.manway_no))
              .map(employee => (
              <tr key={employee.manway_no}>
                <td style={{ textAlign: 'left' }}>{employee.serial_number}</td>
                <td style={{ textAlign: 'left' }}>
                  {swappedEmployees[employee.manway_no] ? (
                    <>
                      <span style={{ textDecoration: 'line-through' }}>{employee.manway_no}</span>
                      <br />
                      <span>{swappedEmployees[employee.manway_no]?.manway_no}</span>
                    </>
                  ) : (
                    employee.manway_no
                  )}
                </td>
                <td style={{ textAlign: 'left' }}>
                  {swappedEmployees[employee.manway_no] ? (
                    <>
                      <span style={{ textDecoration: 'line-through' }}>
                        {employee.name}
                        {type === 'playday' && ` (${playdayCounts[employee.manway_no] || 0})`}
                        {type === 'phd' && ` (${phdCounts[employee.manway_no] || 0})`}
                      </span>
                      <br />
                      <span>
                        {swappedEmployees[employee.manway_no]?.name}
                        {type === 'playday' && ` (${playdayCounts[swappedEmployees[employee.manway_no]!.manway_no] || 0})`}
                        {type === 'phd' && ` (${phdCounts[swappedEmployees[employee.manway_no]!.manway_no] || 0})`}
                      </span>
                    </>
                  ) : (
                    <>
                      {employee.name}
                      {type === 'playday' && ` (${playdayCounts[employee.manway_no] || 0})`}
                      {type === 'phd' && ` (${phdCounts[employee.manway_no] || 0})`}
                    </>
                  )}
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedEmployees.has(employee.manway_no)}
                    onChange={() => handleCheckboxChange(employee.manway_no)}
                    disabled={!userIsAdmin}
                  />
                </td>
                {userIsAdmin && (type === 'phd' || type === 'playday') && (
                  <td>
                    <button onClick={() => openSwapModal(employee)}>Swap</button>
                    {swappedEmployees[employee.manway_no] && (
                      <button onClick={() => handleResetSwap(employee.manway_no)} style={{ marginLeft: '5px', backgroundColor: '#dc3545' }}>
                        Reset
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isSwapModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Replace {employeeToSwap?.name}</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Manway No.</th>
                    <th>Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getAvailableForSwap().map(emp => (
                    <tr key={emp.manway_no}>
                      <td>{emp.manway_no}</td>
                      <td>
                        {emp.name}
                        {type === 'playday' && ` (${playdayCounts[emp.manway_no] || 0})`}
                        {type === 'phd' && ` (${phdCounts[emp.manway_no] || 0})`}
                      </td>
                      <td>
                        <button onClick={() => handleSwap(emp)}>Select</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={closeSwapModal}>Cancel</button>
          </div>
        </div>
      )}

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
              {reportEmployees.map((employee, index) => {
                const replacement = swappedEmployees[employee.manway_no];
                return (
                  <tr key={employee.manway_no}>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{index + 1}</td>
                    {replacement ? (
                      <>
                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>
                          <span style={{ textDecoration: 'line-through' }}>{employee.manway_no}</span>
                          <br />
                          {replacement.manway_no}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>
                          <span style={{ textDecoration: 'line-through' }}>{employee.name}</span>
                          <br />
                          {replacement.name}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{employee.manway_no}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{employee.name}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <button onClick={handleSaveAndDownload} disabled={loading}>
        {loading ? 'Loading...' : 'Save and Download Report'}
      </button>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default MarkEligibility;
