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
    canActivate: [roleGuard(['Doctor', 'MedicalAssistant'])],
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
    path: 'patient/:patientId/profile',
    loadComponent: () =>
      import('./features/patient-access/pages/doctor-patient-profile/doctor-patient-profile').then(
        (m) => m.DoctorPatientProfile
      ),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'patient/:patientId/assistant-profile',
    loadComponent: () =>
      import(
        './features/patient-access/pages/assistant-patient-profile/assistant-patient-profile'
      ).then((m) => m.AssistantPatientProfile),
    canActivate: [roleGuard(['MedicalAssistant'])],
  },
  {
    path: 'patient/:patientId/add-diagnostic',
    loadComponent: () =>
      import('./features/diagnostics/pages/add-diagnostic/add-diagnostic').then(
        (m) => m.AddDiagnostic
      ),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'patient/:patientId/create-diagnostic-draft',
    loadComponent: () =>
      import('./features/diagnostics/pages/create-diagnostic-draft/create-diagnostic-draft').then(
        (m) => m.CreateDiagnosticDraft
      ),
    canActivate: [roleGuard(['MedicalAssistant'])],
  },
  {
    path: 'patient/:patientId/finalize-diagnostic-draft',
    loadComponent: () =>
      import(
        './features/diagnostics/pages/finalize-diagnostic-draft/finalize-diagnostic-draft'
      ).then((m) => m.FinalizeDiagnosticDraft),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'patient/:patientId/add-prescription',
    loadComponent: () =>
      import('./features/prescriptions/pages/create-prescription/create-prescription').then(
        (m) => m.CreatePrescription
      ),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'patient/:patientId/diagnostics',
    loadComponent: () =>
      import('./features/patient-access/pages/patient-diagnostics/patient-diagnostics').then(
        (m) => m.PatientDiagnostics
      ),
    canActivate: [roleGuard(['Doctor', 'MedicalAssistant'])],
  },
  {
    path: 'patient/:patientId/lab-analyses',
    loadComponent: () =>
      import('./features/patient-access/pages/patient-lab-analyses/patient-lab-analyses').then(
        (m) => m.PatientLabAnalyses
      ),
    canActivate: [roleGuard(['Doctor', 'MedicalAssistant'])],
  },
  {
    path: 'patient/:patientId/prescriptions',
    loadComponent: () =>
      import('./features/patient-access/pages/patient-prescriptions/patient-prescriptions').then(
        (m) => m.PatientPrescriptions
      ),
    canActivate: [roleGuard(['Doctor', 'MedicalAssistant'])],
  },
  {
    path: 'patient/:patientId/medical-data',
    loadComponent: () =>
      import('./features/patient-access/pages/patient-medical-data/patient-medical-data').then(
        (m) => m.PatientMedicalData
      ),
    canActivate: [roleGuard(['Doctor', 'MedicalAssistant'])],
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
    path: 'medical-data',
    loadComponent: () =>
      import('./features/medical-data/pages/get-medical-data/get-medical-data').then(
        (m) => m.GetMedicalData
      ),
    canActivate: [roleGuard(['Patient'])],
  },
  {
    path: '',
    loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home),
  },
  {
    path: 'doctor-profile',
    loadComponent: () =>
      import('./features/profile/pages/doctor-profile/doctor-profile').then((m) => m.DoctorProfile),
    canActivate: [roleGuard(['Doctor'])],
  },
  {
    path: 'lab-tech-profile',
    loadComponent: () =>
      import('./features/profile/pages/lab-tech-profile/lab-tech-profile').then(
        (m) => m.LabTechProfile
      ),
    canActivate: [roleGuard(['LaboratoryTechnician'])],
  },
  {
    path: 'pharmacist-profile',
    loadComponent: () =>
      import('./features/profile/pages/pharmacist-profile/pharmacist-profile').then(
        (m) => m.PharmacistProfile
      ),
    canActivate: [roleGuard(['Pharmacist'])],
  },
  {
    path: 'medical-assistant-profile',
    loadComponent: () =>
      import('./features/profile/pages/medical-assistant-profile/medical-assistant-profile').then(
        (m) => m.MedicalAssistantProfile
      ),
    canActivate: [roleGuard(['MedicalAssistant'])],
  },
  {
    path: 'user-management',
    loadComponent: () =>
      import('./features/admin/pages/user-management/user-management').then(
        (m) => m.UserManagement
      ),
    canActivate: [roleGuard(['Administrator'])],
  },
];
