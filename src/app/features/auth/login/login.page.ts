import { Component, OnInit } from '@angular/core';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QueueService } from 'src/app/core/services/queue';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {

  loginForm!: FormGroup;
  role: 'user' | 'admin' = 'user';
  isSubmitted = false;

  constructor(
    private auth: Auth,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private formBuilder: FormBuilder,
    private queueService: QueueService
  ) { }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() { return this.loginForm.controls; }

  async login() {
    this.isSubmitted = true;
    if (this.loginForm.invalid) {
      return;
    }
    
    const { email, password } = this.loginForm.value;
    const loading = await this.loadingCtrl.create({ message: 'Logging in...' });
    await loading.present();
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      const dbRole = await this.queueService.getUserRole(credential.user.uid);
      await loading.dismiss();
      
      if (dbRole !== this.role) {
        await this.auth.signOut(); // Log them out since the role didn't match
        await this.showAlert('Role Mismatch', `You are trying to log in as ${this.role}, but this account is registered as ${dbRole}.`);
        return;
      }

      if (dbRole === 'admin') {
        this.router.navigateByUrl('/admin', { replaceUrl: true });
      } else {
        this.router.navigateByUrl('/user', { replaceUrl: true });
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Login error:', error.code, error.message);
      await this.showAlert('Login Failed', this.getErrorMessage(error.code));
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/wrong-password': return 'Incorrect password. Please try again.';
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/invalid-credential': return 'Invalid email or password.';
      case 'auth/too-many-requests': return 'Too many failed attempts. Try again later.';
      default: return 'Login failed. Please try again.';
    }
  }
}
