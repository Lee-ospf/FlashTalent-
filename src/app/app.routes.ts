import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
//import { roleGuard } from './core/guards/role.guard';
import { adminGuard } from './core/guards/role.guard';
export const routes: Routes = [
{
  path: 'admin/vacancies',
  canActivate: [adminGuard],
  loadComponent: () => import('./features/admin/vacancy-list/vacancy-list.component').then(m => m.VacancyListComponent)
},
{
  path: 'admin/skills',
  canActivate: [adminGuard],
  loadComponent: () => import('./features/admin/skill-list/skill-list.component').then(m => m.SkillListComponent)
},
{
  path: 'admin/departments',
  canActivate: [adminGuard],
  loadComponent: () => import('./features/admin/department-list/department-list.component').then(m => m.DepartmentListComponent)
},
{
  path: 'admin/applications',
  canActivate: [adminGuard],
  loadComponent: () => import('./features/admin/application-list/application-list.component').then(m => m.ApplicationListComponent)
},
// Candidate-side (no guard needed, same as profile/documents)
{ path: 'skills', loadComponent: () => import('./features/skills/candidate-skills.component').then(m => m.CandidateSkillsComponent) },
{ path: 'experience', loadComponent: () => import('./features/experience/candidate-experience.component').then(m => m.CandidateExperienceComponent) },
{ path: 'qualifications', loadComponent: () => import('./features/qualifications/candidate-qualifications.component').then(m => m.CandidateQualificationsComponent) },

// Admin-side
{ path: 'admin/clients', canActivate: [adminGuard], loadComponent: () => import('./features/admin/client-list/client-list.component').then(m => m.ClientListComponent) },
{
  path: 'admin/vacancies/new',
  canActivate: [adminGuard],
  loadComponent: () => import('./features/admin/create-vacancy/create-vacancy.component').then(m => m.CreateVacancyComponent)
},
{ path: 'admin/recruiters', canActivate: [adminGuard], loadComponent: () => import('./features/admin/recruiter-list/recruiter-list.component').then(m => m.RecruiterListComponent) },
{
  path: 'admin/vacancies/:id/edit',
  canActivate: [adminGuard],
  loadComponent: () => import('./features/admin/create-vacancy/create-vacancy.component').then(m => m.CreateVacancyComponent)
},
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
  { path: 'documents', canActivate: [authGuard], loadComponent: () => import('./features/documents/documents.component').then(m => m.DocumentsComponent) },
  { path: 'vacancies', canActivate: [authGuard], loadComponent: () => import('./features/vacancies/vacancies.component').then(m => m.VacanciesComponent) },
  { path: 'applications', canActivate: [authGuard], loadComponent: () => import('./features/applications/applications.component').then(m => m.ApplicationsComponent) },
  { path: '**', redirectTo: 'login' }
  
];
