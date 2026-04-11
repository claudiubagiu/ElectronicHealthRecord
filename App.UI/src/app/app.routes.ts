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
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/pages/patient-profile/patient-profile').then(
        (m) => m.PatientProfile
      ),
    canActivate: [roleGuard(['Patient'])],
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
  {
    path: 'add-medication',
    loadComponent: () =>
      import('./features/medications/pages/add-medication/add-medication').then(
        (m) => m.AddMedication
      ),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'medications',
    loadComponent: () =>
      import('./features/medications/pages/get-medications/get-medications').then(
        (m) => m.GetMedications
      ),
    canActivate: [roleGuard(['Patient'])],
  },
  {
    path: 'patient/:patientId/medications',
    loadComponent: () =>
      import('./features/patient-access/pages/patient-medications/patient-medications').then(
        (m) => m.PatientMedications
      ),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'add-lab-analysis',
    loadComponent: () =>
      import('./features/lab-analyses/pages/add-lab-analysis/add-lab-analysis').then(
        (m) => m.AddLabAnalysis
      ),
    canActivate: [roleGuard(['LaboratoryTechnician'])],
  },
  {
    path: 'lab-analyses',
    loadComponent: () =>
      import('./features/lab-analyses/pages/get-lab-analyses/get-lab-analyses').then(
        (m) => m.GetLabAnalyses
      ),
    canActivate: [roleGuard(['Patient'])],
  },
  {
    path: 'patient/:patientId/lab-analyses',
    loadComponent: () =>
      import('./features/patient-access/pages/patient-lab-analyses/patient-lab-analyses').then(
        (m) => m.PatientLabAnalyses
      ),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'add-prescription',
    loadComponent: () =>
      import('./features/prescriptions/pages/create-prescription/create-prescription').then(
        (m) => m.CreatePrescription
      ),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'prescriptions',
    loadComponent: () =>
      import('./features/prescriptions/pages/get-prescriptions/get-prescriptions').then(
        (m) => m.GetPrescriptions
      ),
    canActivate: [roleGuard(['Patient'])],
  },
  {
    path: 'dispense',
    loadComponent: () =>
      import('./features/prescriptions/pages/dispense-prescription/dispense-prescription').then(
        (m) => m.DispensePrescription
      ),
    canActivate: [roleGuard(['Pharmacist'])],
  },
  {
    path: 'patient/:patientId/profile',
    loadComponent: () =>
      import('./features/patient-access/pages/doctor-patient-profile/doctor-patient-profile').then(
        (m) => m.DoctorPatientProfile
      ),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'patient/:patientId/prescriptions',
    loadComponent: () =>
      import('./features/patient-access/pages/patient-prescriptions/patient-prescriptions').then(
        (m) => m.PatientPrescriptions
      ),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: '',
    loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home),
  },
];
