import { Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  collection, addDoc, query, where, getDocs,
  orderBy, onSnapshot, doc, updateDoc, increment, getDoc, setDoc
} from 'firebase/firestore';
import { Auth } from '@angular/fire/auth';

export interface Queue {
  id: string;
  name: string;
  description: string;
  location: string;
  category: string;
  avgServiceTime: number;
  currentToken: number;
  totalTokens: number;
  isActive: boolean;
  createdBy: string;
  createdAt: any;
  announcement?: string;
  organizationName: string;
}

export interface QueueToken {
  id: string;
  queueId: string;
  queueName: string;
  organizationName?: string;
  tokenNumber: number;
  userId: string;
  userName: string;
  status: 'waiting' | 'serving' | 'done' | 'cancelled';
  createdAt: any;
  servingAt?: string;
}

@Injectable({ providedIn: 'root' })
export class QueueService {

  constructor(private firestore: Firestore, private auth: Auth) { }

  // ─── USER MANAGEMENT ───────────────────────────────────────────
  async saveUser(uid: string, data: { name: string; email: string; role: string }) {
    await setDoc(doc(this.firestore, 'users', uid), data, { merge: true });
  }

  async getUserRole(uid: string): Promise<string> {
    const snap = await getDoc(doc(this.firestore, 'users', uid));
    return snap.exists() ? (snap.data()['role'] || 'user') : 'user';
  }

  // ─── QUEUES ─────────────────────────────────────────────────────
  async createQueue(data: {
    name: string; description: string; location: string;
    category: string; avgServiceTime: number;
  }) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    // Fetch the user's organization name from Firestore
    const userDoc = await getDoc(doc(this.firestore, 'users', user.uid));
    const organizationName = userDoc.exists() ? (userDoc.data()['organizationName'] || 'Independent') : 'Independent';

    return addDoc(collection(this.firestore, 'queues'), {
      ...data,
      createdBy: user.uid,
      organizationName,
      currentToken: 0,
      totalTokens: 0,
      isActive: true,
      createdAt: new Date()
    });
  }

  getActiveQueues(callback: (queues: Queue[]) => void): () => void {
    const q = query(
      collection(this.firestore, 'queues'),
      where('isActive', '==', true)
    );
    return onSnapshot(q, snap => {
      const queues = snap.docs.map(d => ({ id: d.id, ...d.data() } as Queue));
      queues.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
        return timeB - timeA;
      });
      callback(queues);
    }, err => console.error(err));
  }

  getAdminQueues(adminUid: string, callback: (queues: Queue[]) => void): () => void {
    const q = query(
      collection(this.firestore, 'queues'),
      where('createdBy', '==', adminUid)
    );
    return onSnapshot(q, snap => {
      const queues = snap.docs.map(d => ({ id: d.id, ...d.data() } as Queue));
      queues.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
        return timeB - timeA;
      });
      callback(queues);
    }, err => console.error(err));
  }

  async getQueue(queueId: string): Promise<Queue | null> {
    const snap = await getDoc(doc(this.firestore, 'queues', queueId));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Queue : null;
  }

  async toggleQueueStatus(queueId: string, isActive: boolean) {
    await updateDoc(doc(this.firestore, 'queues', queueId), { isActive });
  }

  async updateAnnouncement(queueId: string, message: string) {
    await updateDoc(doc(this.firestore, 'queues', queueId), { announcement: message });
  }

  // ─── TOKENS ─────────────────────────────────────────────────────
  async joinQueue(queueId: string, queueName: string): Promise<{ tokenNumber: number; tokenId: string; alreadyJoined: boolean }> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Please log in to join a queue.');

    // Check already joined
    const existingQ = query(
      collection(this.firestore, 'queueTokens'),
      where('queueId', '==', queueId),
      where('userId', '==', user.uid),
      where('status', '==', 'waiting')
    );
    const existing = await getDocs(existingQ);
    if (!existing.empty) {
      const d = existing.docs[0].data();
      return { tokenNumber: d['tokenNumber'], tokenId: existing.docs[0].id, alreadyJoined: true };
    }

    // Get next token number
    const lastQ = query(
      collection(this.firestore, 'queueTokens'),
      where('queueId', '==', queueId)
    );
    const lastSnap = await getDocs(lastQ);
    let maxToken = 0;
    lastSnap.forEach(d => {
      const num = d.data()['tokenNumber'];
      if (num > maxToken) maxToken = num;
    });
    const nextToken = maxToken + 1;

    const queueSnap = await getDoc(doc(this.firestore, 'queues', queueId));

    const tokenRef = await addDoc(collection(this.firestore, 'queueTokens'), {
      queueId,
      queueName,
      organizationName: queueSnap.exists() ? (queueSnap.data()['organizationName'] || 'Independent') : 'Independent',
      tokenNumber: nextToken,
      userId: user.uid,
      userName: user.displayName || user.email || 'User',
      status: 'waiting',
      createdAt: new Date()
    });

    await updateDoc(doc(this.firestore, 'queues', queueId), { totalTokens: increment(1) });
    return { tokenNumber: nextToken, tokenId: tokenRef.id, alreadyJoined: false };
  }

  async leaveQueue(tokenId: string, queueId: string) {
    // Update token status to cancelled
    await updateDoc(doc(this.firestore, 'queueTokens', tokenId), { status: 'cancelled' });
    // Decrement totalTokens in the queue
    await updateDoc(doc(this.firestore, 'queues', queueId), { totalTokens: increment(-1) });
  }

  async addWalkInToken(queueId: string, queueName: string) {
    // Get next token number
    const lastQ = query(
      collection(this.firestore, 'queueTokens'),
      where('queueId', '==', queueId)
    );
    const lastSnap = await getDocs(lastQ);
    let maxToken = 0;
    lastSnap.forEach(d => {
      const num = d.data()['tokenNumber'];
      if (num > maxToken) maxToken = num;
    });
    const nextToken = maxToken + 1;

    const queueSnap = await getDoc(doc(this.firestore, 'queues', queueId));
    
    await addDoc(collection(this.firestore, 'queueTokens'), {
      queueId,
      queueName,
      organizationName: queueSnap.exists() ? (queueSnap.data()['organizationName'] || 'Independent') : 'Independent',
      tokenNumber: nextToken,
      userId: 'walk-in',
      userName: `Walk-In #${nextToken}`,
      status: 'waiting',
      createdAt: new Date()
    });

    await updateDoc(doc(this.firestore, 'queues', queueId), { totalTokens: increment(1) });
  }

  getMyTokens(userId: string, callback: (tokens: QueueToken[]) => void): () => void {
    const q = query(
      collection(this.firestore, 'queueTokens'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, snap => {
      let tokens = snap.docs.map(d => ({ id: d.id, ...d.data() } as QueueToken));
      tokens = tokens.filter(t => t.status !== 'done' && t.status !== 'cancelled');
      tokens.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'serving' ? -1 : 1;
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
        return timeB - timeA;
      });
      callback(tokens);
    }, err => console.error(err));
  }

  getMyHistory(userId: string, callback: (tokens: QueueToken[]) => void): () => void {
    const q = query(
      collection(this.firestore, 'queueTokens'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, snap => {
      let tokens = snap.docs.map(d => ({ id: d.id, ...d.data() } as QueueToken));
      tokens = tokens.filter(t => t.status === 'done' || t.status === 'cancelled');
      tokens.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
        return timeB - timeA;
      });
      callback(tokens);
    }, err => console.error(err));
  }

  getQueueTokens(queueId: string, callback: (tokens: QueueToken[]) => void): () => void {
    const q = query(
      collection(this.firestore, 'queueTokens'),
      where('queueId', '==', queueId)
    );
    return onSnapshot(q, snap => {
      let tokens = snap.docs.map(d => ({ id: d.id, ...d.data() } as QueueToken));
      tokens.sort((a, b) => a.tokenNumber - b.tokenNumber);
      callback(tokens);
    }, err => console.error(err));
  }

  async callNextToken(queueId: string, counterName?: string) {
    const queueRef = doc(this.firestore, 'queues', queueId);
    
    // Fetch all tokens for this queue
    const tokensQ = query(
      collection(this.firestore, 'queueTokens'),
      where('queueId', '==', queueId)
    );
    const tokensSnap = await getDocs(tokensQ);
    
    let currentServing = null;
    let nextWaiting = null;
    
    const docs = tokensSnap.docs.slice();
    docs.sort((a, b) => a.data()['tokenNumber'] - b.data()['tokenNumber']);
    
    for (const docSnap of docs) {
      const data = docSnap.data();
      if (data['status'] === 'serving') {
        currentServing = docSnap;
      }
      if (data['status'] === 'waiting' && !nextWaiting) {
        nextWaiting = docSnap;
      }
    }
    
    if (!nextWaiting) {
      if (currentServing) {
        await updateDoc(currentServing.ref, { status: 'done' });
      }
      throw new Error('No more users waiting in the queue.');
    }

    // Mark current serving as done
    if (currentServing) {
      await updateDoc(currentServing.ref, { status: 'done' });
    }
    
    // Mark next waiting as serving
    const updateData: any = { status: 'serving' };
    if (counterName) updateData.servingAt = counterName;
    await updateDoc(nextWaiting.ref, updateData);
    await updateDoc(queueRef, { currentToken: nextWaiting.data()['tokenNumber'] });
  }

  async delayTurn(tokenId: string, queueId: string) {
    // Find the token
    const tokenRef = doc(this.firestore, 'queueTokens', tokenId);
    const tokenSnap = await getDoc(tokenRef);
    if (!tokenSnap.exists() || tokenSnap.data()['status'] !== 'waiting') return;

    const currentTokenNumber = tokenSnap.data()['tokenNumber'];

    // Find the next waiting token in the queue
    const tokensQ = query(
      collection(this.firestore, 'queueTokens'),
      where('queueId', '==', queueId),
      where('status', '==', 'waiting')
    );
    const waitingTokensSnap = await getDocs(tokensQ);
    const docs = waitingTokensSnap.docs.slice();
    docs.sort((a, b) => a.data()['tokenNumber'] - b.data()['tokenNumber']);

    let nextTokenDoc = null;
    for (const d of docs) {
      if (d.data()['tokenNumber'] > currentTokenNumber) {
        nextTokenDoc = d;
        break;
      }
    }

    if (!nextTokenDoc) {
      throw new Error('You are already the last person in line.');
    }

    // Swap token numbers
    await updateDoc(tokenRef, { tokenNumber: nextTokenDoc.data()['tokenNumber'] });
    await updateDoc(nextTokenDoc.ref, { tokenNumber: currentTokenNumber });
  }
}