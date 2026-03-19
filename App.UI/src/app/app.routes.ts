import { Routes } from '@angular/router';
import { Register } from './features/auth/pages/register/register';
import { Login } from './features/auth/pages/login/login';
import { guestGuard } from './core/guards/guest.guard';
import { AddDiagnostic } from './features/diagnostics/pages/add-diagnostic/add-diagnostic'
import { roleGuard } from './core/guards/role.guard';
import { GetDiagnostics } from './features/diagnostics/pages/get-diagnostics/get-diagnostics';
import { PatientAccess } from './features/patient-access/pages/patient-access/patient-access';
import { AccessManagement } from './features/access-management/pages/access-management/access-management';
import { PatientDiagnostics } from './features/patient-access/pages/patient-diagnostics/patient-diagnostics';

export const routes: Routes = [
  { path: 'register', component: Register, canActivate: [guestGuard] },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  {
    path: 'add-diagnostic',
    component: AddDiagnostic,
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'diagnostics',
    component: GetDiagnostics,
    canActivate: [roleGuard(['Patient'])],
  },
  {
    path: 'patient-access',
    component: PatientAccess,
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'access-management',
    component: AccessManagement,
    canActivate: [roleGuard(['Patient'])],
  },
  {
    path: 'patient/:patientId/diagnostics',
    component: PatientDiagnostics,
    canActivate: [roleGuard(['Doctor'])],
  },
];
