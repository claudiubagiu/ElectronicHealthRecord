import { Routes } from '@angular/router';
import { Register } from './features/auth/pages/register/register';
import { Login } from './features/auth/pages/login/login';
import { guestGuard } from './core/guards/guest.guard';
import { ProposeDiagnostic } from './features/diagnostics/pages/propose-diagnostic/propose-diagnostic';
import { GetProposedDiagnostics } from './features/diagnostics/pages/get-proposed-diagnostics/get-proposed-diagnostics';
import { roleGuard } from './core/guards/role.guard';
import { GetDiagnostics } from './features/diagnostics/pages/get-diagnostics/get-diagnostics';
import { PatientAccess } from './features/patient-access/pages/patient-access/patient-access';
import { AccessManagement } from './features/access-management/pages/access-management/access-management';
import { PatientDiagnostics } from './features/patient-access/pages/patient-diagnostics/patient-diagnostics';

export const routes: Routes = [
  { path: 'register', component: Register, canActivate: [guestGuard] },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  {
    path: 'propose-diagnostic',
    component: ProposeDiagnostic,
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'proposed-diagnostics',
    component: GetProposedDiagnostics,
    canActivate: [roleGuard(['Patient'])],
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
