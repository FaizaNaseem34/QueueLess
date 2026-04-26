import { Component, OnInit, OnDestroy } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { QueueService, Queue, QueueToken } from 'src/app/core/services/queue';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit, OnDestroy {

  queues: Queue[] = [];
  myTokens: QueueToken[] = [];
  historyTokens: QueueToken[] = [];
  activeTab: 'queues' | 'myTokens' | 'history' = 'queues';
  loadingQueues = true;
  isScannerOpen = false;
  private html5QrcodeScanner: any;
  
  private previousTokens: { [id: string]: string } = {};
  private queuesUnsub?: () => void;
  private tokensUnsub?: () => void;
  private historyUnsub?: () => void;

  constructor(
    private auth: Auth,
    private router: Router,
    private queueService: QueueService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    const user = this.auth.currentUser;
    if (!user) { this.router.navigateByUrl('/auth/login'); return; }

    this.queuesUnsub = this.queueService.getActiveQueues((queues) => {
      this.queues = queues;
      this.loadingQueues = false;
    });

    this.tokensUnsub = this.queueService.getMyTokens(user.uid, async (tokens) => {
      for (const token of tokens) {
        const prevStatus = this.previousTokens[token.id];
        if (prevStatus === 'waiting' && token.status === 'serving') {
          const toast = await this.toastCtrl.create({
            message: `🔔 It's your turn in ${token.queueName} (Token #${token.tokenNumber})!`,
            duration: 10000,
            position: 'top',
            color: 'success',
            buttons: [{ text: 'Dismiss', role: 'cancel' }]
          });
          await toast.present();
        }
        this.previousTokens[token.id] = token.status;
      }
      this.myTokens = tokens;
    });

    this.historyUnsub = this.queueService.getMyHistory(user.uid, (tokens) => {
      this.historyTokens = tokens;
    });
  }

  ngOnDestroy() {
    this.queuesUnsub?.();
    this.tokensUnsub?.();
    this.historyUnsub?.();
  }

  async joinQueue(queue: Queue) {
    const loading = await this.loadingCtrl.create({ message: 'Joining queue...' });
    await loading.present();
    try {
      const result = await this.queueService.joinQueue(queue.id, queue.name);
      await loading.dismiss();
      if (result.alreadyJoined) {
        (await this.alertCtrl.create({
          header: 'Already Joined',
          message: `You already have token #${result.tokenNumber} in this queue.`,
          buttons: ['OK']
        })).present();
      } else {
        (await this.alertCtrl.create({
          header: '🎫 Token Assigned!',
          message: `Your token number is #${result.tokenNumber}. Please wait for your turn.`,
          buttons: [{ text: 'View My Tokens', handler: () => { this.activeTab = 'myTokens'; } }, 'OK']
        })).present();
      }
    } catch (err: any) {
      await loading.dismiss();
      (await this.alertCtrl.create({ header: 'Error', message: err.message, buttons: ['OK'] })).present();
    }
  }

  async delayTurn(token: QueueToken) {
    const alert = await this.alertCtrl.create({
      header: 'Delay Turn?',
      message: 'This will push you back one spot in the queue. Are you sure?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Delay',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Delaying turn...' });
            await loading.present();
            try {
              await this.queueService.delayTurn(token.id, token.queueId);
            } catch (err: any) {
              (await this.alertCtrl.create({ header: 'Cannot Delay', message: err.message, buttons: ['OK'] })).present();
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async leaveQueue(token: QueueToken) {
    const alert = await this.alertCtrl.create({
      header: 'Leave Queue?',
      message: 'Are you sure you want to cancel your token? You will lose your spot in line.',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Yes, Leave',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Cancelling token...' });
            await loading.present();
            try {
              await this.queueService.leaveQueue(token.id, token.queueId);
            } catch (err: any) {
              (await this.alertCtrl.create({ header: 'Error', message: err.message, buttons: ['OK'] })).present();
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  getPosition(token: QueueToken): number {
    const queue = this.queues.find(q => q.id === token.queueId);
    if (!queue || token.status === 'serving') return 0;
    return Math.max(0, token.tokenNumber - (queue.currentToken || 0));
  }

  getEstimatedWait(token: QueueToken): number {
    const queue = this.queues.find(q => q.id === token.queueId);
    return this.getPosition(token) * (queue?.avgServiceTime || 5);
  }

  getProgress(token: QueueToken): number {
    const queue = this.queues.find(q => q.id === token.queueId);
    if (!queue || token.status === 'serving') return 1;
    if (token.tokenNumber === 0) return 0;
    const progress = (queue.currentToken || 0) / token.tokenNumber;
    return Math.min(progress, 1);
  }

  getAnnouncement(queueId: string): string | null {
    return this.queues.find(q => q.id === queueId)?.announcement || null;
  }

  getStatusColor(status: string): string {
    return status === 'serving' ? 'success' : status === 'waiting' ? 'warning' : 'medium';
  }

  getUserName(): string {
    return this.auth.currentUser?.displayName || this.auth.currentUser?.email || 'User';
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigateByUrl('/auth/login', { replaceUrl: true });
  }

  openScanner() {
    this.isScannerOpen = true;
    setTimeout(() => {
      this.html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
        false
      );
      this.html5QrcodeScanner.render(
        (decodedText: string) => {
          this.closeScanner();
          try {
            const url = new URL(decodedText);
            const pathParts = url.pathname.split('/');
            const queueIdIndex = pathParts.indexOf('queue');
            if (queueIdIndex !== -1 && pathParts.length > queueIdIndex + 1) {
              const qId = pathParts[queueIdIndex + 1];
              this.router.navigateByUrl(`/queue/${qId}`);
            } else {
              this.alertCtrl.create({ header: 'Invalid QR', message: 'This QR code is not a valid QueueLess code.', buttons: ['OK'] }).then(a => a.present());
            }
          } catch(e) {
            this.alertCtrl.create({ header: 'Invalid QR', message: 'Could not parse the scanned QR code.', buttons: ['OK'] }).then(a => a.present());
          }
        },
        (error: any) => { /* ignore */ }
      );
    }, 300);
  }

  closeScanner() {
    this.isScannerOpen = false;
    if (this.html5QrcodeScanner) {
      try {
        this.html5QrcodeScanner.clear();
      } catch (e) { console.error('Error clearing scanner', e); }
      this.html5QrcodeScanner = null;
    }
  }
}
