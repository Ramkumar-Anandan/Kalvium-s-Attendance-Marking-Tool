export type AttendanceStatus =
  | 'Unassigned'
  | 'Present'
  | 'On leave'
  | 'AWOL'
  | 'Late'
  | 'Half day leave'
  | 'Remote'
  | 'Holiday'
  | 'Half day remote'
  | 'Permission';

export interface Member {
  id: string;
  campus: string;
  name: string;
  designation: string;
  status: AttendanceStatus;
}

export const STATUSES: AttendanceStatus[] = [
  'Unassigned',
  'Present',
  'On leave',
  'AWOL',
  'Late',
  'Half day leave',
  'Remote',
  'Holiday',
  'Half day remote',
  'Permission',
];
