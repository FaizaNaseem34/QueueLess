import { Component, OnInit } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QueueService } from 'src/app/core/services/queue';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: false
})
export class SignupPage implements OnInit {

  signupForm!: FormGroup;
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
    this.signupForm = this.formBuilder.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      organizationName: [''] // Optional by default, checked dynamically
    });
  }

  get f() { return this.signupForm.controls; }

  async signup() {
    this.isSubmitted = true;
    
    // Dynamic validation for organization name
    if (this.role === 'admin' && !this.f['organizationName'].value) {
      this.f['organizationName'].setErrors({ required: true });
    } else if (this.role === 'user') {
      this.f['organizationName'].setErrors(null);
    }

    if (this.signupForm.invalid) {
      return;
    }

    const { fullName, email, password, organizationName } = this.signupForm.value;

    const loading = await this.loadingCtrl.create({ message: 'Creating account...' });
    await loading.present();
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      await updateProfile(credential.user, { displayName: fullName });
      // Save user profile with role and organization to Firestore
      const userData: any = {
        name: fullName,
        email: email,
        role: this.role
      };
      if (this.role === 'admin') {
        userData.organizationName = organizationName;
      }
      await this.queueService.saveUser(credential.user.uid, userData);
      await loading.dismiss();
      if (this.role === 'admin') {
        this.router.navigateByUrl('/admin', { replaceUrl: true });
      } else {
        this.router.navigateByUrl('/user', { replaceUrl: true });
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Signup error:', error.code, error.message);
      await this.showAlert('Sign Up Failed', this.getErrorMessage(error.code));
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      default: return 'Sign up failed. Please try again.';
    }
  }
}
