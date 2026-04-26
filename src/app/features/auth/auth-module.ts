import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';



// Import pages (IMPORTANT)
import { LoginPage } from './login/login.page';
import { SignupPage } from './signup/signup.page';
import { ForgotPasswordPage } from './forgot-password/forgot-password.page';

@NgModule({
  declarations: [
    LoginPage,
    SignupPage,
    ForgotPasswordPage
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    // ⚠️ This connects routing
  ]
})
export class AuthModule { }