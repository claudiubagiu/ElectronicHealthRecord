import { Routes } from '@angular/router';
import { Register } from './features/auth/pages/register/register';
import { Login } from './features/auth/pages/login/login';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: 'register', component: Register, canActivate: [guestGuard] },
  { path: 'login', component: Login, canActivate: [guestGuard] },
];
