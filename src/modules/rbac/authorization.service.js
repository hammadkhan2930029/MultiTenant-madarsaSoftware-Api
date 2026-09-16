import { AppError } from '../../utils/appError.js';
import { getSupportingReadPermissions, MODULE_PERMISSION_MAP } from './rbac.constants.js';
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isSuperAdmin,
  isTenantAdmin,
  normalizePermissions,
} from './rbac.utils.js';

const getActionForRequest = (req) => {
  if (req.method === 'GET') return 'view';
  if (req.method === 'POST') return 'create';
  if (req.method === 'DELETE') return 'delete';
  if (req.method === 'PUT' || req.method === 'PATCH') {
    return /\/(deactivate|delete|remove)(\/|$)/i.test(req.originalUrl) ? 'delete' : 'update';
  }

  return null;
};

const getRequiredPermissionForRequest = (req) => {
  if (req.originalUrl.startsWith('/api/auth/login')) return null;
  if (req.originalUrl.startsWith('/api/auth/change-password')) return null;
  if (req.originalUrl.startsWith('/api/auth/me')) return null;
  if (req.originalUrl.startsWith('/api/auth/profile')) {
    return req.method === 'GET' ? null : 'settings.update';
  }
  if (req.originalUrl.startsWith('/api/tenants')) return null;

  const [, apiSegment] = req.originalUrl.split('/').filter(Boolean);
  const moduleName = MODULE_PERMISSION_MAP[apiSegment];
  const action = getActionForRequest(req);

  if (!moduleName || !action) return null;
  if (req.originalUrl.startsWith('/api/roles')) {
    return action === 'view' ? 'roles.view' : 'roles.manage';
  }
  if (req.originalUrl.startsWith('/api/users')) {
    return action === 'view' ? 'users.view' : 'users.manage';
  }
  if (req.originalUrl.startsWith('/api/students') && /\/(assign-class|class-assignments)(\/|$)/i.test(req.originalUrl)) {
    return ['students.assign_class', 'students.edit'];
  }
  if (req.originalUrl.startsWith('/api/teachers') && /\/increments(\/|$)/i.test(req.originalUrl)) {
    return req.method === 'GET' ? ['teachers.view', 'teachers.salary_increments.view'] : 'teachers.update';
  }
  if (req.originalUrl.startsWith('/api/teacher-schedules')) {
    return req.method === 'GET' ? 'teachers.view' : 'teachers.update';
  }
  if (req.originalUrl.startsWith('/api/teacher-assignments')) {
    if (req.method === 'GET') {
      return [
        'teachers.assignments.view',
        'teachers.attendance.view',
        'teachers.attendance.create',
        'teachers.attendance.edit',
        'teachers.attendance.delete',
      ];
    }
    if (req.method === 'POST') return 'teachers.assignments.create';
    if (req.method === 'DELETE') return 'teachers.assignments.delete';
    return 'teachers.assignments.edit';
  }
  if (req.originalUrl.startsWith('/api/schedules')) {
    return 'students.schedule.view';
  }
  if (req.originalUrl.startsWith('/api/exam-results')) {
    if (req.method === 'GET') return 'exam_results.view';
    if (req.method === 'DELETE') return 'exams.delete';
    return 'exam_results.create';
  }
  if (req.originalUrl.startsWith('/api/exam-schedules') && req.method === 'GET') {
    return ['exams.view', 'exam_results.create'];
  }
  if (req.originalUrl.startsWith('/api/attendance')) {
    if (req.originalUrl.startsWith('/api/attendance/staff')) {
      if (req.method === 'GET') {
        return ['staff.attendance.view', 'staff.attendance.create', 'staff.attendance.edit', 'staff.attendance.delete'];
      }
      if (req.method === 'DELETE') return 'staff.attendance.delete';
      return ['staff.attendance.create', 'staff.attendance.edit'];
    }
    if (req.originalUrl.startsWith('/api/attendance/teachers')) {
      if (req.method === 'GET') {
        return ['teachers.attendance.view', 'teachers.attendance.create', 'teachers.attendance.edit', 'teachers.attendance.delete'];
      }
      if (req.method === 'DELETE') return 'teachers.attendance.delete';
      return ['teachers.attendance.create', 'teachers.attendance.edit'];
    }
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      return ['attendance.create', 'attendance.edit'];
    }
    return action === 'view'
      ? ['attendance.view', 'attendance.create', 'attendance.edit', 'attendance.history.view']
      : `attendance.${action}`;
  }
  if (req.originalUrl.startsWith('/api/hifz/')) {
    const [, , hifzSegment] = req.originalUrl.split('/').filter(Boolean);
    const hifzModule = hifzSegment === 'sipara' ? 'para' : hifzSegment;
    if (['daily', 'weekly', 'monthly', 'para'].includes(hifzModule)) {
      return action === 'view' ? `hifz.${hifzModule}.view` : `hifz.${hifzModule}.create`;
    }
  }
  if (req.originalUrl.startsWith('/api/finance/student-fees')) {
    if (req.method === 'PATCH' && /\/payment(\/|$)/i.test(req.originalUrl)) return ['student_fees.collect', 'student_fees.edit'];
    if (req.method === 'POST' && /\/generate(\/|$)/i.test(req.originalUrl)) return 'student_fees.create';
    if (req.method === 'GET' && /\/student\/\d+\/history(\/|$)/i.test(req.originalUrl)) return ['student_fees.history', 'student_fees.view', 'student_fees.collect', 'student_fees.edit'];
    return action === 'view'
      ? ['student_fees.view', 'student_fees.create', 'student_fees.collect', 'student_fees.history', 'student_fees.edit']
      : `student_fees.${action}`;
  }
  if (req.originalUrl.startsWith('/api/finance/transactions')) {
    if (action === 'view') return 'finance.transactions.view';
    if (action === 'update' || action === 'delete') return 'finance.transactions.create';
    return `finance.transactions.${action}`;
  }
  if (req.originalUrl.startsWith('/api/finance/expense-categories') || req.originalUrl.startsWith('/api/finance/heads')) {
    if (action === 'view') return ['finance.heads.view', 'finance.heads.edit'];
    if (action === 'create' || action === 'update' || action === 'delete') return 'finance.heads.edit';
  }
  if (req.originalUrl.startsWith('/api/finance/fund-collections')) {
    if (action === 'view') return ['funds.view', 'funds.create'];
    if (action === 'update') return ['funds.edit', 'funds.create'];
    if (action === 'delete') return ['funds.delete', 'funds.create'];
    return `funds.${action}`;
  }
  if (req.originalUrl.startsWith('/api/finance/financial')) {
    if (action === 'view') return ['finance.transactions.view', 'reports.view'];
    if (action === 'update' || action === 'delete') return 'finance.transactions.create';
    return `finance.transactions.${action}`;
  }
  if (req.originalUrl.startsWith('/api/finance/salaries')) {
    if (action === 'view') return 'salary.view';
    if (action === 'update') return 'salary.edit';
    return `salary.${action}`;
  }
  if (req.originalUrl.startsWith('/api/finance/reports')) return ['finance.reports.view', 'reports.view'];
  if (req.originalUrl.startsWith('/api/finance/expenses')) {
    return action === 'view' ? 'finance.transactions.view' : 'finance.transactions.create';
  }
  if (req.originalUrl.startsWith('/api/finance')) {
    return action === 'view' ? 'finance.view' : `finance.${action}`;
  }
  if (req.originalUrl.startsWith('/api/financial')) {
    return action === 'view' ? 'finance.transactions.view' : 'finance.transactions.create';
  }
  if (req.originalUrl.startsWith('/api/store/approvals') || /\/(approve|reject)(\/|$)/i.test(req.originalUrl)) {
    return 'store.approve';
  }
  if (req.originalUrl.startsWith('/api/store/export')) return 'store.export';
  if (req.originalUrl.startsWith('/api/store/print')) return 'store.print';
  if (req.originalUrl.startsWith('/api/store/reports')) return 'store.reports';
  if (moduleName === 'reports') return 'reports.view';
  if (moduleName === 'settings') {
    return action === 'view' ? 'settings.view' : 'settings.update';
  }
  if (['schedules', 'subjects'].includes(moduleName) && action === 'update') {
    return `${moduleName}.edit`;
  }
  if (moduleName === 'parents' && action === 'update') {
    return 'parents.edit';
  }
  if (moduleName === 'support' && action !== 'view') return 'support.create';
  if (moduleName === 'suggestions' && action !== 'view') return 'suggestions.create';

  const primaryPermission = `${moduleName}.${action}`;
  if (action === 'view') {
    return [primaryPermission, ...getSupportingReadPermissions(apiSegment)];
  }

  return primaryPermission;
};

const assertAnyPermission = (auth, permissions = []) => {
  const requiredPermissions = normalizePermissions(permissions);
  if (hasAnyPermission(auth, requiredPermissions)) return;

  throw new AppError('آپ کو یہ عمل کرنے کی اجازت نہیں ہے۔', 403);
};

const assertAllPermissions = (auth, permissions = []) => {
  const requiredPermissions = normalizePermissions(permissions);
  if (hasAllPermissions(auth, requiredPermissions)) return;

  throw new AppError('آپ کو یہ عمل کرنے کی اجازت نہیں ہے۔', 403);
};

const enforceRoutePermission = (req) => {
  const requiredPermission = getRequiredPermissionForRequest(req);
  if (!requiredPermission) return;

  assertAnyPermission(req.auth, [requiredPermission]);
};

export const authorizationService = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isSuperAdmin,
  isTenantAdmin,
  assertAnyPermission,
  assertAllPermissions,
  enforceRoutePermission,
  getRequiredPermissionForRequest,
};
