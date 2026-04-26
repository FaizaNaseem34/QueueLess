import { Component } from '@angular/core';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false
})
export class ForgotPasswordPage {

  email = '';

  constructor(
    private auth: Auth,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) { }

  async sendReset() {
    if (!this.email) {
      await this.showAlert('Missing Email', 'Please enter your email address.');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Sending reset link...' });
    await loading.present();

    try {
      await sendPasswordResetEmail(this.auth, this.email);
      await loading.dismiss();
      await this.showAlert(
        'Email Sent ✅',
        `A password reset link has been sent to ${this.email}. Please check your inbox.`
      );
      this.router.navigateByUrl('/auth/login');
    } catch (error: any) {
      await loading.dismiss();
      await this.showAlert('Error', this.getErrorMessage(error.code));
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/user-not-found': return 'No account found with this email address.';
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      default: return 'Failed to send reset email. Please try again.';
    }
  }
}
