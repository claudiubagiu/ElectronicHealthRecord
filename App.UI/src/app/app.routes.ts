import { Routes } from '@angular/router';
import { Register } from './features/auth/pages/register/register';
import { Login } from './features/auth/pages/login/login';
import { guestGuard } from './core/guards/guest.guard';
import { ProposeDiagnostic } from './features/diagnostics/pages/propose-diagnostic/propose-diagnostic';
import { GetProposedDiagnostics } from './features/diagnostics/pages/get-proposed-diagnostics/get-proposed-diagnostics';
import { roleGuard } from './core/guards/role.guard';

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
];
