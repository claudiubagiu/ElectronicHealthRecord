import { Routes } from '@angular/router';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'register',
    loadComponent: () => import('./features/auth/pages/register/register').then((m) => m.Register),
    canActivate: [guestGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'add-diagnostic',
    loadComponent: () =>
      import('./features/diagnostics/pages/add-diagnostic/add-diagnostic').then(
        (m) => m.AddDiagnostic
      ),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'diagnostics',
    loadComponent: () =>
      import('./features/diagnostics/pages/get-diagnostics/get-diagnostics').then(
        (m) => m.GetDiagnostics
      ),
    canActivate: [roleGuard(['Patient'])],
  },
  {
    path: 'patient-access',
    loadComponent: () =>
      import('./features/patient-access/pages/patient-access/patient-access').then(
        (m) => m.PatientAccess
      ),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'access-management',
    loadComponent: () =>
      import('./features/access-management/pages/access-management/access-management').then(
        (m) => m.AccessManagement
      ),
    canActivate: [roleGuard(['Patient'])],
  },
  {
    path: 'patient/:patientId/diagnostics',
    loadComponent: () =>
      import('./features/patient-access/pages/patient-diagnostics/patient-diagnostics').then(
        (m) => m.PatientDiagnostics
      ),
    canActivate: [roleGuard(['Doctor'])],
  },
];
