export const TENANT_ADMIN_BYPASS_BLOCKED_PREFIXES = ['tenant_management.', 'tenants.'];

// Read-only data that an operational page needs in order to do its own job.
// These permissions do not grant the resource's menu/page permission or any write access.
export const SUPPORTING_READ_PERMISSIONS = {
  students: [
    'students.create', 'students.edit', 'students.update', 'students.assign_class',
    'students.id_card.view', 'attendance.view', 'attendance.create', 'attendance.edit',
    'attendance.mark', 'attendance.history.view', 'fees.view', 'fees.create',
    'hifz.daily.view', 'hifz.daily.create', 'hifz.weekly.view', 'hifz.weekly.create',
    'hifz.monthly.view', 'hifz.monthly.create', 'hifz.para.view', 'hifz.para.create',
    'exam_results.view', 'exam_results.create', 'students.schedule.view',
  ],
  parents: ['students.create', 'students.edit', 'students.update'],
  classes: [
    'students.create', 'students.assign_class', 'attendance.view', 'attendance.create',
    'attendance.edit', 'attendance.mark', 'students.schedule.view', 'exams.view',
    'exams.create', 'exam_results.view', 'exam_results.create',
    'hifz.daily.view', 'hifz.daily.create', 'hifz.weekly.view', 'hifz.weekly.create',
    'hifz.monthly.view', 'hifz.monthly.create', 'hifz.para.view', 'hifz.para.create',
  ],
  sections: [
    'students.create', 'students.assign_class', 'attendance.view', 'attendance.create',
    'attendance.edit', 'attendance.mark', 'students.schedule.view', 'exams.view',
    'exams.create', 'exam_results.view', 'exam_results.create',
    'hifz.daily.view', 'hifz.daily.create', 'hifz.weekly.view', 'hifz.weekly.create',
    'hifz.monthly.view', 'hifz.monthly.create', 'hifz.para.view', 'hifz.para.create',
  ],
  sessions: [
    'students.create', 'students.assign_class', 'attendance.view', 'attendance.create',
    'attendance.edit', 'attendance.mark', 'students.schedule.view', 'exams.view',
    'exams.create', 'exam_results.view', 'exam_results.create',
  ],
  teachers: [
    'students.create', 'students.edit', 'students.update', 'teachers.attendance.view',
    'teachers.attendance.create', 'teachers.assignments.view',
    'teachers.assignments.create', 'students.schedule.view', 'salary.view', 'salary.create',
  ],
  subjects: [
    'students.schedule.view', 'teachers.assignments.view', 'teachers.assignments.create',
    'exams.view', 'exams.create', 'exam_results.view', 'exam_results.create',
  ],
};

export const getSupportingReadPermissions = (resource) => SUPPORTING_READ_PERMISSIONS[resource] || [];

export const MODULE_PERMISSION_MAP = {
  branches: 'branches',
  classes: 'classes',
  sections: 'sections',
  sessions: 'settings',
  subjects: 'subjects',
  students: 'students',
  parents: 'parents',
  attendance: 'attendance',
  teachers: 'teachers',
  hifz: 'hifz',
  finance: 'finance',
  financial: 'finance',
  reports: 'reports',
  cities: 'settings',
  departments: 'settings',
  qualifications: 'settings',
  shifts: 'settings',
  schedules: 'schedules',
  'teacher-schedules': 'teachers',
  'teacher-assignments': 'teachers',
  'exam-schedules': 'exams',
  'exam-results': 'exams',
  'result-grades': 'exams',
  store: 'store',
  suggestions: 'suggestions',
  support: 'support',
  roles: 'roles',
  users: 'users',
  'audit-logs': 'audit',
};
