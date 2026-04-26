import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { QueueService, Queue } from 'src/app/core/services/queue';

@Component({
  selector: 'app-join',
  templateUrl: './join.page.html',
  styleUrls: ['./join.page.scss'],
  standalone: false
})
export class JoinPage implements OnInit {

  queueId: string | null = null;
  queueDetails: Queue | null = null;
  fetchingDetails: boolean = true;
  loading: boolean = false;
  tokenNumber: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private queueService: QueueService,
    private alertCtrl: AlertController
  ) { }

  async ngOnInit() {
    this.queueId = this.route.snapshot.paramMap.get('id');
    if (this.queueId) {
      try {
        this.queueDetails = await this.queueService.getQueue(this.queueId);
      } catch (err) {
        console.error('Error fetching queue details', err);
      }
    }
    this.fetchingDetails = false;
  }

  async joinQueue() {
    if (!this.queueDetails) return;
    this.loading = true;
    this.tokenNumber = null;

    try {
      const token = await this.queueService.joinQueue(this.queueDetails.id, this.queueDetails.name);
      this.tokenNumber = token.tokenNumber;
      
      const alert = await this.alertCtrl.create({
        header: token.alreadyJoined ? 'Already Joined' : '🎫 Token Assigned!',
        message: token.alreadyJoined ? `You already have token #${token.tokenNumber} in this queue.` : `Your token number is #${token.tokenNumber}. Redirecting to dashboard...`,
        buttons: ['OK']
      });
      await alert.present();
      await alert.onDidDismiss();
      
      this.router.navigateByUrl('/user', { replaceUrl: true });
    } catch (error: any) {
      console.error('Error joining queue:', error);
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: error.message || 'Could not join queue. Make sure you are logged in.',
        buttons: [
          {
            text: 'Login',
            handler: () => { this.router.navigateByUrl('/auth/login'); }
          },
          'Cancel'
        ]
      });
      await alert.present();
    } finally {
      this.loading = false;
    }
  }
}