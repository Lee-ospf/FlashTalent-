import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
  { path: 'documents', canActivate: [authGuard], loadComponent: () => import('./features/documents/documents.component').then(m => m.DocumentsComponent) },
  { path: 'vacancies', canActivate: [authGuard], loadComponent: () => import('./features/vacancies/vacancies.component').then(m => m.VacanciesComponent) },
  { path: 'applications', canActivate: [authGuard], loadComponent: () => import('./features/applications/applications.component').then(m => m.ApplicationsComponent) },
  { path: '**', redirectTo: 'login' }
];
