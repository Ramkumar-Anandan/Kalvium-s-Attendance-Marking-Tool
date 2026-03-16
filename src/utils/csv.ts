import Papa from 'papaparse';
import { Member, AttendanceStatus } from '../types';

export const parseCSV = (file: File): Promise<Member[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length === 0) {
          resolve([]);
          return;
        }

        // Check if first row is header
        let startIndex = 0;
        const firstRow = data[0];
        if (
          firstRow[0]?.toLowerCase().includes('campus') ||
          firstRow[1]?.toLowerCase().includes('name') ||
          firstRow[2]?.toLowerCase().includes('designation') ||
          firstRow[2]?.toLowerCase().includes('role')
        ) {
          startIndex = 1;
        }

        const members: Member[] = [];
        for (let i = startIndex; i < data.length; i++) {
          const row = data[i];
          if (row.length >= 3) {
            members.push({
              id: crypto.randomUUID(),
              campus: row[0].trim(),
              name: row[1].trim(),
              designation: row[2].trim(),
              status: 'Unassigned',
            });
          }
        }
        resolve(members);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const exportCSV = (members: Member[]) => {
  const data = members.map((m) => ({
    Campus: m.campus,
    Name: m.name,
    Designation: m.designation,
    'Attendance Status': m.status,
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
