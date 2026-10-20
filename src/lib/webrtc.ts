import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { User, Contact, IncomingCall } from '../types';

// Standard Google STUN servers
export const defaultIceServers: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
];

export const rtcConfiguration: RTCConfiguration = {
  iceServers: defaultIceServers,
  iceCandidatePoolSize: 10,
};

/**
 * Acquire local audio and video media stream with fallbacks
 */
export async function getLocalUserMedia(
  type: 'voice' | 'video'
): Promise<{ stream: MediaStream | null; error: string | null }> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { stream: null, error: 'WebRTC MediaDevices API is not supported in this environment.' };
  }

  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video:
      type === 'video'
        ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          }
        : false,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return { stream, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`getUserMedia failed for ${type} call:`, errorMsg);

    // If video failed, attempt audio-only fallback
    if (type === 'video') {
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return {
          stream: audioOnlyStream,
          error: 'Camera could not be accessed. Continued with audio only.',
        };
      } catch (audioErr) {
        return {
          stream: null,
          error: 'Microphone permission denied. Please allow microphone access to make calls.',
        };
      }
    }

    return {
      stream: null,
      error: 'Microphone permission denied. Please allow microphone access in your browser.',
    };
  }
}

export interface WebRTCEventHandlers {
  onRemoteStream: (stream: MediaStream) => void;
  onCallConnected: () => void;
  onCallEnded: (reason?: string) => void;
  onError: (error: Error) => void;
  onLocalStreamReady: (stream: MediaStream) => void;
}

/**
 * WebRTCCallSession manages 1:1 call lifecycle with Firestore signaling
 */
export class WebRTCCallSession {
  public peerConnection: RTCPeerConnection | null = null;
  public localStream: MediaStream | null = null;
  public remoteStream: MediaStream = new MediaStream();
  public callId: string | null = null;
  public isCaller: boolean = false;
  private callDocUnsub: (() => void) | null = null;
  private candidatesUnsub: (() => void) | null = null;
  private isCleanedUp: boolean = false;

  constructor(private handlers: WebRTCEventHandlers) {}

  /**
   * Caller initiates an outgoing call
   */
  public async startCall(
    callId: string,
    caller: User,
    callee: Contact,
    type: 'voice' | 'video'
  ): Promise<void> {
    this.callId = callId;
    this.isCaller = true;
    this.isCleanedUp = false;

    // 1. Get local audio/video media
    const { stream, error } = await getLocalUserMedia(type);
    if (error && !stream) {
      this.handlers.onError(new Error(error));
    }

    if (stream) {
      this.localStream = stream;
      this.handlers.onLocalStreamReady(stream);
    }

    // 2. Initialize RTCPeerConnection
    this.peerConnection = new RTCPeerConnection(rtcConfiguration);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    // Handle remote tracks arrival
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      this.handlers.onRemoteStream(this.remoteStream);
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      const state = this.peerConnection.connectionState;
      if (state === 'connected') {
        this.handlers.onCallConnected();
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (!this.isCleanedUp) {
          this.handlers.onCallEnded('Peer disconnected');
        }
      }
    };

    // Candidate queues
    let isDocReady = false;
    const pendingLocalCandidates: RTCIceCandidateInit[] = [];
    const pendingRemoteCandidates: RTCIceCandidateInit[] = [];

    // ICE Candidate generation: push to Firestore callerCandidates
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate && this.callId && auth.currentUser) {
        if (!isDocReady) {
          pendingLocalCandidates.push(event.candidate.toJSON());
          return;
        }
        try {
          const candCol = collection(db, 'calls', this.callId, 'callerCandidates');
          await addDoc(candCol, {
            ...event.candidate.toJSON(),
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Could not write caller ICE candidate:', e);
        }
      }
    };

    // 3. Create and set SDP Offer
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: type === 'video',
    });
    await this.peerConnection.setLocalDescription(offer);

    // 4. Write call session document to Firestore
    const callDocRef = doc(db, 'calls', callId);
    const now = new Date().toISOString();

    try {
      await setDoc(callDocRef, {
        id: callId,
        callerId: caller.id,
        callerName: caller.displayName,
        callerUsername: caller.username,
        callerAvatarUrl: caller.avatarUrl || '',
        calleeId: callee.id,
        calleeName: callee.displayName,
        calleeUsername: callee.username,
        type,
        status: 'calling',
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
        createdAt: now,
      });

      // Mark doc ready and flush any buffered local candidates
      isDocReady = true;
      for (const cand of pendingLocalCandidates) {
        try {
          const candCol = collection(db, 'calls', callId, 'callerCandidates');
          await addDoc(candCol, {
            ...cand,
            createdAt: new Date().toISOString(),
          });
        } catch (flushErr) {
          console.warn('Failed to flush local caller candidate:', flushErr);
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `calls/${callId}`);
    }

    // 5. Listen to call document for Callee Answer or Rejection
    this.callDocUnsub = onSnapshot(callDocRef, async (snap) => {
      if (!snap.exists() || this.isCleanedUp) return;
      const data = snap.data();

      if (data.status === 'rejected') {
        this.handlers.onCallEnded('Call was declined');
        this.cleanup();
        return;
      }

      if (data.status === 'ended') {
        this.handlers.onCallEnded('Call ended by recipient');
        this.cleanup();
        return;
      }

      // When callee's SDP answer arrives
      if (data.answer && this.peerConnection && this.peerConnection.signalingState === 'have-local-offer') {
        try {
          const answerDesc = new RTCSessionDescription(data.answer);
          await this.peerConnection.setRemoteDescription(answerDesc);
          this.handlers.onCallConnected();

          // Flush any buffered remote candidates now that remote description is set
          while (pendingRemoteCandidates.length > 0) {
            const candInit = pendingRemoteCandidates.shift();
            if (candInit && this.peerConnection) {
              try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candInit));
              } catch (iceErr) {
                console.warn('Error adding buffered remote candidate:', iceErr);
              }
            }
          }
        } catch (e) {
          console.warn('Error setting remote answer description:', e);
        }
      }
    });

    // 6. Listen to Callee ICE Candidates
    const calleeCandCol = collection(db, 'calls', callId, 'calleeCandidates');
    this.candidatesUnsub = onSnapshot(calleeCandCol, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' && this.peerConnection) {
          const data = change.doc.data();
          const candInit: RTCIceCandidateInit = {
            candidate: data.candidate,
            sdpMid: data.sdpMid,
            sdpMLineIndex: data.sdpMLineIndex,
          };

          // If remote description isn't set yet, buffer the candidate
          if (!this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.type) {
            pendingRemoteCandidates.push(candInit);
          } else {
            try {
              const candidate = new RTCIceCandidate(candInit);
              await this.peerConnection.addIceCandidate(candidate);
            } catch (e) {
              console.warn('Error adding callee ICE candidate:', e);
            }
          }
        }
      });
    });
  }

  /**
   * Callee answers an incoming call
   */
  public async answerCall(callId: string, type: 'voice' | 'video'): Promise<void> {
    this.callId = callId;
    this.isCaller = false;
    this.isCleanedUp = false;

    // 1. Get local user media
    const { stream, error } = await getLocalUserMedia(type);
    if (error && !stream) {
      this.handlers.onError(new Error(error));
    }

    if (stream) {
      this.localStream = stream;
      this.handlers.onLocalStreamReady(stream);
    }

    // 2. Initialize RTCPeerConnection
    this.peerConnection = new RTCPeerConnection(rtcConfiguration);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    // Remote track handler
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      this.handlers.onRemoteStream(this.remoteStream);
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      const state = this.peerConnection.connectionState;
      if (state === 'connected') {
        this.handlers.onCallConnected();
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (!this.isCleanedUp) {
          this.handlers.onCallEnded('Peer disconnected');
        }
      }
    };

    // Callee Candidate queue
    let isAnswerSaved = false;
    const pendingCalleeCandidates: RTCIceCandidateInit[] = [];

    // ICE Candidate handler for callee
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate && this.callId && auth.currentUser) {
        if (!isAnswerSaved) {
          pendingCalleeCandidates.push(event.candidate.toJSON());
          return;
        }
        try {
          const candCol = collection(db, 'calls', this.callId, 'calleeCandidates');
          await addDoc(candCol, {
            ...event.candidate.toJSON(),
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Could not write callee ICE candidate:', e);
        }
      }
    };

    // 3. Fetch call doc and set remote offer
    const callDocRef = doc(db, 'calls', callId);
    const callSnap = await getDoc(callDocRef);
    if (!callSnap.exists()) {
      throw new Error('Call session no longer exists.');
    }

    const callData = callSnap.data();
    if (!callData.offer) {
      throw new Error('No SDP offer found in call session.');
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));

    // 4. Create and set Answer
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // 5. Update call doc in Firestore
    try {
      await updateDoc(callDocRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
        status: 'connected',
        connectedAt: new Date().toISOString(),
      });

      // Mark answer saved and flush buffered callee candidates
      isAnswerSaved = true;
      for (const cand of pendingCalleeCandidates) {
        try {
          const candCol = collection(db, 'calls', callId, 'calleeCandidates');
          await addDoc(candCol, {
            ...cand,
            createdAt: new Date().toISOString(),
          });
        } catch (flushErr) {
          console.warn('Failed to flush callee candidate:', flushErr);
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `calls/${callId}`);
    }

    // 6. Listen for Caller ICE Candidates
    const callerCandCol = collection(db, 'calls', callId, 'callerCandidates');
    this.candidatesUnsub = onSnapshot(callerCandCol, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' && this.peerConnection) {
          const data = change.doc.data();
          try {
            const candidate = new RTCIceCandidate({
              candidate: data.candidate,
              sdpMid: data.sdpMid,
              sdpMLineIndex: data.sdpMLineIndex,
            });
            await this.peerConnection.addIceCandidate(candidate);
          } catch (e) {
            console.warn('Error adding caller ICE candidate:', e);
          }
        }
      });
    });

    // 7. Listen to call document for status changes
    this.callDocUnsub = onSnapshot(callDocRef, (snap) => {
      if (!snap.exists() || this.isCleanedUp) return;
      const data = snap.data();
      if (data.status === 'ended') {
        this.handlers.onCallEnded('Call ended by caller');
        this.cleanup();
      }
    });
  }

  /**
   * Toggle mute microphone
   */
  public toggleMute(isMuted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }

  /**
   * Toggle camera feed
   */
  public toggleVideo(isVideoOff: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !isVideoOff;
      });
    }
  }

  /**
   * End the call and signal Firestore
   */
  public async endCall(): Promise<void> {
    if (this.isCleanedUp) return;
    const currentCallId = this.callId;

    if (currentCallId && auth.currentUser) {
      try {
        const callDocRef = doc(db, 'calls', currentCallId);
        await updateDoc(callDocRef, {
          status: 'ended',
          endedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Could not update call ended status in Firestore:', e);
      }
    }

    this.cleanup();
  }

  /**
   * Reject an incoming call
   */
  public static async rejectCall(callId: string): Promise<void> {
    if (!auth.currentUser || !callId) return;
    try {
      const callDocRef = doc(db, 'calls', callId);
      await updateDoc(callDocRef, {
        status: 'rejected',
        endedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not reject call in Firestore:', e);
    }
  }

  /**
   * Complete teardown of peer connection and media streams
   */
  public cleanup(): void {
    if (this.isCleanedUp) return;
    this.isCleanedUp = true;

    if (this.callDocUnsub) {
      this.callDocUnsub();
      this.callDocUnsub = null;
    }

    if (this.candidatesUnsub) {
      this.candidatesUnsub();
      this.candidatesUnsub = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping local track:', e);
        }
      });
      this.localStream = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {
        console.warn('Error closing peer connection:', e);
      }
      this.peerConnection = null;
    }

    this.remoteStream = new MediaStream();
  }
}

/**
 * Subscribe to incoming calls where calleeId == currentUserId and status == 'calling'
 */
export function subscribeToIncomingCalls(
  userId: string,
  onIncomingCall: (call: IncomingCall) => void,
  onCallCancelled?: (callId: string) => void
): () => void {
  if (!auth.currentUser || !userId || auth.currentUser.uid !== userId) {
    return () => {};
  }

  const q = query(
    collection(db, 'calls'),
    where('calleeId', '==', userId),
    where('status', '==', 'calling')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const callerContact: Contact = {
            id: data.callerId,
            username: data.callerUsername || '@user',
            displayName: data.callerName || 'Unknown Caller',
            avatarUrl: data.callerAvatarUrl || '',
            status: 'online',
          };

          onIncomingCall({
            callId: change.doc.id,
            contact: callerContact,
            type: data.type || 'voice',
            timestamp: Date.now(),
          });
        } else if (change.type === 'removed') {
          if (onCallCancelled) {
            onCallCancelled(change.doc.id);
          }
        }
      });
    },
    (error) => {
      if (auth.currentUser && auth.currentUser.uid === userId) {
        handleFirestoreError(error, OperationType.GET, 'calls');
      } else {
        console.warn('Incoming calls listener ended:', error);
      }
    }
  );
}
