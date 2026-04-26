import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { QueueService, Queue, QueueToken } from 'src/app/core/services/queue';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit, OnDestroy {

  queues: Queue[] = [];
  selectedQueue: Queue | null = null;
  queueTokens: QueueToken[] = [];
  qrCodes: { [id: string]: string } = {};
  showCreateForm = false;
  createForm: FormGroup;
  categories = ['General', 'Medical', 'Banking', 'Government', 'Education', 'Retail'];
  announcementMessage: string = '';

  private queuesUnsub?: () => void;
  private tokensUnsub?: () => void;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router,
    private queueService: QueueService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {
    this.createForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      location: ['', Validators.required],
      category: ['General', Validators.required],
      avgServiceTime: [5, [Validators.required, Validators.min(1), Validators.max(120)]]
    });
  }

  ngOnInit() {
    const user = this.auth.currentUser;
    if (!user) { this.router.navigateByUrl('/auth/login'); return; }

    this.queuesUnsub = this.queueService.getAdminQueues(user.uid, async (queues) => {
      this.queues = queues;
      for (const q of queues) {
        if (!this.qrCodes[q.id]) {
          const url = `${window.location.origin}/queue/${q.id}`;
          try {
            this.qrCodes[q.id] = await QRCode.toDataURL(url, { width: 180, margin: 2, color: { dark: '#0a4d3c', light: '#ffffff' } });
          } catch(e) {
            console.error('QR Code error:', e);
          }
        }
      }
    });
  }

  ngOnDestroy() {
    this.queuesUnsub?.();
    this.tokensUnsub?.();
  }

  async createQueue() {
    if (this.createForm.invalid) { 
      this.createForm.markAllAsTouched(); 
      (await this.alertCtrl.create({ header: 'Incomplete Form', message: 'Please fill in all required fields.', buttons: ['OK'] })).present();
      return; 
    }
    const loading = await this.loadingCtrl.create({ message: 'Creating queue...' });
    await loading.present();
    try {
      await this.queueService.createQueue(this.createForm.value);
      await loading.dismiss();
      this.showCreateForm = false;
      this.createForm.reset({ avgServiceTime: 5, category: 'General' });
    } catch (err: any) {
      await loading.dismiss();
      (await this.alertCtrl.create({ header: 'Error', message: err.message, buttons: ['OK'] })).present();
    }
  }

  selectQueue(queue: Queue) {
    this.selectedQueue = queue;
    this.announcementMessage = queue.announcement || '';
    this.tokensUnsub?.();
    this.tokensUnsub = this.queueService.getQueueTokens(queue.id, (tokens) => {
      this.queueTokens = tokens;
    });
  }

  async callNext() {
    if (!this.selectedQueue) return;
    
    const alert = await this.alertCtrl.create({
      header: 'Call Next Token',
      message: 'Enter the counter or room number (optional)',
      inputs: [
        {
          name: 'counter',
          type: 'text',
          placeholder: 'e.g., Counter 3'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Call',
          handler: async (data) => {
            try {
              await this.queueService.callNextToken(this.selectedQueue!.id, data.counter);
            } catch (err: any) {
              (await this.alertCtrl.create({ header: 'Error', message: err.message, buttons: ['OK'] })).present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async toggleQueue(queue: Queue, event: any) {
    event.stopPropagation();
    await this.queueService.toggleQueueStatus(queue.id, !queue.isActive);
  }

  get waitingTokens() { return this.queueTokens.filter(t => t.status === 'waiting'); }
  get servingTokens() { return this.queueTokens.filter(t => t.status === 'serving'); }
  get doneTokens()    { return this.queueTokens.filter(t => t.status === 'done'); }
  get cancelledTokens() { return this.queueTokens.filter(t => t.status === 'cancelled'); }

  async updateAnnouncement() {
    if (!this.selectedQueue) return;
    const loading = await this.loadingCtrl.create({ message: 'Updating...' });
    await loading.present();
    try {
      await this.queueService.updateAnnouncement(this.selectedQueue.id, this.announcementMessage);
      this.selectedQueue.announcement = this.announcementMessage;
    } catch (err: any) {
      (await this.alertCtrl.create({ header: 'Error', message: err.message, buttons: ['OK'] })).present();
    } finally {
      await loading.dismiss();
    }
  }

  async addWalkIn() {
    if (!this.selectedQueue) return;
    const loading = await this.loadingCtrl.create({ message: 'Adding Walk-In...' });
    await loading.present();
    try {
      await this.queueService.addWalkInToken(this.selectedQueue.id, this.selectedQueue.name);
    } catch (err: any) {
      (await this.alertCtrl.create({ header: 'Error', message: err.message, buttons: ['OK'] })).present();
    } finally {
      await loading.dismiss();
    }
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigateByUrl('/auth/login', { replaceUrl: true });
  }
}
