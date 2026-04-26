import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadChildren: () =>
          import('./features/auth/login/login.module').then(m => m.LoginPageModule)
      },
      {
        path: 'signup',
        loadChildren: () =>
          import('./features/auth/signup/signup.module').then(m => m.SignupPageModule)
      },
      {
        path: 'forgot-password',
        loadChildren: () =>
          import('./features/auth/forgot-password/forgot-password.module').then(m => m.ForgotPasswordPageModule)
      }
    ]
  },
  {
    path: 'user',
    loadChildren: () =>
      import('./features/user/dashboard/dashboard.module').then(m => m.UserDashboardPageModule)
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/dashboard/dashboard.module').then(m => m.AdminDashboardPageModule)
  },
  {
    path: 'queue/:id',
    loadChildren: () =>
      import('./features/queue/join/join.module').then(m => m.JoinPageModule)
  },
  {
    path: 'splash',
    loadChildren: () => import('./features/splash/splash.module').then( m => m.SplashPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule { }