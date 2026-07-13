import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiResponse } from './utils/apiResponse.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { branchesRoutes } from './modules/branches/branches.routes.js';
import { classesRoutes } from './modules/classes/classes.routes.js';
import { sectionsRoutes } from './modules/sections/sections.routes.js';
import { sessionsRoutes } from './modules/sessions/sessions.routes.js';
import { studentsRoutes } from './modules/students/students.routes.js';
import { parentsRoutes } from './modules/parents/parents.routes.js';
import { teachersRoutes } from './modules/teachers/teachers.routes.js';
import { attendanceRoutes } from './modules/attendance/attendance.routes.js';
import { hifzRoutes } from './modules/hifz/hifz.routes.js';
import { financeRoutes } from './modules/finance/finance.routes.js';
import { financialRoutes } from './modules/finance/financial/financial.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { citiesRoutes } from './modules/cities/cities.routes.js';
import { departmentsRoutes } from './modules/departments/departments.routes.js';
import { qualificationsRoutes } from './modules/qualifications/qualifications.routes.js';
import { shiftsRoutes } from './modules/shifts/shifts.routes.js';
import { subjectsRoutes } from './modules/subjects/subjects.routes.js';
import { schedulesRoutes } from './modules/schedules/schedules.routes.js';
import { teacherSchedulesRoutes } from './modules/teacher-schedules/teacher-schedules.routes.js';
import { examSchedulesRoutes } from './modules/exam-schedules/exam-schedules.routes.js';
import { resultGradesRoutes } from './modules/result-grades/result-grades.routes.js';
import { examResultsRoutes } from './modules/exam-results/exam-results.routes.js';
import { storeRoutes } from './modules/store/store.routes.js';
import { suggestionsRoutes } from './modules/suggestions/suggestions.routes.js';
import { supportRoutes } from './modules/support/support.routes.js';
import { permissionsRoutes } from './modules/permissions/permissions.routes.js';
import { rolesRoutes } from './modules/roles/roles.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { tenantsRoutes } from './modules/tenants/tenants.routes.js';
import { tenantCurrentRoutes } from './modules/tenant-current/tenantCurrent.routes.js';
import { tenantResolverMiddleware } from './middlewares/tenant.middleware.js';
import { notFoundMiddleware } from './middlewares/notFound.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = new Set(
  env.appOrigins.map((origin) => origin.trim().replace(/\/$/, '').toLowerCase())
);
const corsOptions = {
  
  origin(origin, callback) {
    const requestOrigin = origin?.trim().replace(/\/$/, '').toLowerCase();
    if (!origin || allowedOrigins.has(requestOrigin)) {
      return callback(null, true);
    }

    const error = new Error(`CORS blocked for origin: ${origin}`);
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/fonts', express.static(path.join(__dirname, '../public/fonts')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  return apiResponse(res, {
    message: `${env.appName} is running successfully.`,
    data: null,
  });
});

app.use('/api/health', healthRoutes);
app.use('/api', tenantResolverMiddleware);
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/sections', sectionsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/parents', parentsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/hifz', hifzRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/cities', citiesRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/qualifications', qualificationsRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/teacher-schedules', teacherSchedulesRoutes);
app.use('/api/exam-schedules', examSchedulesRoutes);
app.use('/api/result-grades', resultGradesRoutes);
app.use('/api/exam-results', examResultsRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tenant', tenantCurrentRoutes);
app.use('/api/tenants', tenantsRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
