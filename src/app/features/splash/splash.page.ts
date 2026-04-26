import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { QueueService } from 'src/app/core/services/queue';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit {

  constructor(
    private router: Router,
    private auth: Auth,
    private queueService: QueueService
  ) { }

  ngOnInit() {
    setTimeout(async () => {
      const user = this.auth.currentUser;
      if (user) {
        try {
          const role = await this.queueService.getUserRole(user.uid);
          if (role === 'admin') {
            this.router.navigateByUrl('/admin', { replaceUrl: true });
          } else {
            this.router.navigateByUrl('/user', { replaceUrl: true });
          }
        } catch (e) {
          this.router.navigateByUrl('/auth/login', { replaceUrl: true });
        }
      } else {
        this.router.navigateByUrl('/auth/login', { replaceUrl: true });
      }
    }, 5000); // 5 second splash screen
  }

}
