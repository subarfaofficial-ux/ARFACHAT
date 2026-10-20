import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User, Contact, FriendRequest, Message, Conversation } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standardized Firestore Error Handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Boot Connection Test
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore is currently offline or unreachable.');
    }
  }
}
testFirestoreConnection();

// Utility to clean raw username (removes leading @, lowercase, trims)
export function sanitizeUsername(username: string): string {
  return username.replace('@', '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

/**
 * Checks if a username is available in the 'usernames' registry
 */
export async function checkUsernameAvailable(rawUsername: string): Promise<boolean> {
  const clean = sanitizeUsername(rawUsername);
  if (!clean || clean.length < 3) return false;
  try {
    const snap = await getDoc(doc(db, 'usernames', clean));
    return !snap.exists();
  } catch (error) {
    console.warn('Username check warning:', error);
    return true;
  }
}

/**
 * Looks up user by @username (case-insensitive)
 */
export async function lookupUserByUsername(rawUsername: string): Promise<User | null> {
  const clean = sanitizeUsername(rawUsername);
  if (!clean) return null;

  try {
    const usernameDocRef = doc(db, 'usernames', clean);
    const usernameSnap = await getDoc(usernameDocRef);

    if (!usernameSnap.exists()) {
      return null;
    }

    const { userId } = usernameSnap.data() as { userId: string };
    
    // Only attempt to read full user profile if signed in
    if (auth.currentUser) {
      const userDocRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          id: userId,
          username: data.username || `@${clean}`,
          displayName: data.displayName || clean,
          email: '', // Never expose email of other users
          avatarUrl: data.avatarUrl || '',
          bio: data.bio || '',
          status: data.status || 'offline',
          lastSeen: data.status === 'online' ? 'Active now' : (data.lastSeen || 'Recently'),
          joinedDate: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : undefined,
        };
      }
    }

    return null;
  } catch (error) {
    if (auth.currentUser) {
      handleFirestoreError(error, OperationType.GET, `usernames/${clean}`);
    }
    return null;
  }
}

/**
 * Register a new user with Email, Password, Display Name and Unique @username
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName: string,
  rawUsername: string,
  avatarUrl?: string
): Promise<User> {
  const clean = sanitizeUsername(rawUsername);
  if (clean.length < 3) {
    throw new Error('Username must be at least 3 characters.');
  }

  // 1. Verify username availability
  const isAvailable = await checkUsernameAvailable(clean);
  if (!isAvailable) {
    throw new Error(`The username @${clean} is already taken. Please choose another.`);
  }

  // 2. Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const fbUser = userCredential.user;
  const now = new Date().toISOString();

  // 3. Atomically reserve username and create profile in batch
  const batch = writeBatch(db);
  const userDocRef = doc(db, 'users', fbUser.uid);
  const usernameDocRef = doc(db, 'usernames', clean);

  const userData = {
    userId: fbUser.uid,
    username: `@${clean}`,
    usernameLower: clean,
    displayName: displayName.trim(),
    email: email.trim().toLowerCase(),
    avatarUrl: avatarUrl || '',
    bio: 'Hey there! I am using ArfaChat.',
    status: 'online',
    createdAt: now,
  };

  batch.set(userDocRef, userData);
  batch.set(usernameDocRef, {
    usernameLower: clean,
    userId: fbUser.uid,
    email: email.trim().toLowerCase(),
    createdAt: now,
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}`);
  }

  return {
    id: fbUser.uid,
    username: `@${clean}`,
    displayName: displayName.trim(),
    email: fbUser.email || email,
    avatarUrl: avatarUrl || '',
    bio: 'Hey there! I am using ArfaChat.',
    status: 'online',
    joinedDate: 'Joined Today',
  };
}

/**
 * Log in with either @username or email address + password
 */
export async function loginWithCredentials(identifier: string, pass: string): Promise<User> {
  let targetEmail = identifier.trim();

  // If identifier is a username (e.g. @subarfa or subarfa without domain)
  if (!targetEmail.includes('@') || identifier.startsWith('@') || !targetEmail.includes('.')) {
    const clean = sanitizeUsername(identifier);
    const usernameSnap = await getDoc(doc(db, 'usernames', clean));
    if (!usernameSnap.exists()) {
      throw new Error(`No user found with username @${clean}.`);
    }
    const data = usernameSnap.data() as { email?: string; userId?: string };
    if (!data.email) {
      throw new Error(`No email address associated with @${clean}.`);
    }
    targetEmail = data.email;
  }

  const userCredential = await signInWithEmailAndPassword(auth, targetEmail, pass);
  const fbUser = userCredential.user;

  // Retrieve user document from Firestore
  try {
    const userDocSnap = await getDoc(doc(db, 'users', fbUser.uid));
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
        id: fbUser.uid,
        username: data.username,
        displayName: data.displayName || fbUser.displayName || 'User',
        email: fbUser.email || targetEmail,
        avatarUrl: data.avatarUrl || fbUser.photoURL || '',
        bio: data.bio || '',
        status: 'online',
        joinedDate: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Joined 2026',
      };
    } else {
      // Fallback profile if doc was not written yet
      const fallbackUsername = `@${fbUser.email?.split('@')[0] || 'user'}`;
      const newUserData = {
        userId: fbUser.uid,
        username: fallbackUsername,
        usernameLower: sanitizeUsername(fallbackUsername),
        displayName: fbUser.displayName || 'User',
        email: fbUser.email || targetEmail,
        avatarUrl: fbUser.photoURL || '',
        bio: 'Hey there! I am using ArfaChat.',
        status: 'online',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', fbUser.uid), newUserData);
      return {
        id: fbUser.uid,
        username: fallbackUsername,
        displayName: newUserData.displayName,
        email: newUserData.email,
        avatarUrl: newUserData.avatarUrl,
        bio: newUserData.bio,
        status: 'online',
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}`);
  }
}

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle(preferredHandle?: string): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;

  try {
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
        id: fbUser.uid,
        username: data.username,
        displayName: data.displayName || fbUser.displayName || 'User',
        email: fbUser.email || '',
        avatarUrl: data.avatarUrl || fbUser.photoURL || '',
        bio: data.bio || '',
        status: 'online',
      };
    }

    // New Google User: Create username reservation
    const base = sanitizeUsername(preferredHandle || fbUser.displayName || fbUser.email?.split('@')[0] || 'user');
    let chosenClean = base;
    let isAvail = await checkUsernameAvailable(chosenClean);
    if (!isAvail) {
      chosenClean = `${base}_${Math.floor(100 + Math.random() * 900)}`;
    }

    const now = new Date().toISOString();
    const batch = writeBatch(db);

    batch.set(userDocRef, {
      userId: fbUser.uid,
      username: `@${chosenClean}`,
      usernameLower: chosenClean,
      displayName: fbUser.displayName || 'User',
      email: fbUser.email || '',
      avatarUrl: fbUser.photoURL || '',
      bio: 'Hey there! I am using ArfaChat.',
      status: 'online',
      createdAt: now,
    });

    batch.set(doc(db, 'usernames', chosenClean), {
      usernameLower: chosenClean,
      userId: fbUser.uid,
      email: fbUser.email || '',
      createdAt: now,
    });

    await batch.commit();

    return {
      id: fbUser.uid,
      username: `@${chosenClean}`,
      displayName: fbUser.displayName || 'User',
      email: fbUser.email || '',
      avatarUrl: fbUser.photoURL || '',
      bio: 'Hey there! I am using ArfaChat.',
      status: 'online',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}`);
  }
}

/**
 * Send a Friend Request to target user
 */
export async function sendFriendRequest(
  currentUser: User,
  targetUser: User
): Promise<void> {
  if (currentUser.id === targetUser.id) {
    throw new Error('You cannot send a friend request to yourself.');
  }

  // Create request document with unique composite ID to prevent duplicate requests
  const requestId = `${currentUser.id}_to_${targetUser.id}`;
  const requestDocRef = doc(db, 'friendRequests', requestId);

  const existingSnap = await getDoc(requestDocRef);
  if (existingSnap.exists()) {
    const data = existingSnap.data();
    if (data.status === 'pending') {
      throw new Error('A friend request to this user is already pending.');
    }
  }

  const now = new Date().toISOString();
  try {
    await setDoc(requestDocRef, {
      id: requestId,
      fromUserId: currentUser.id,
      fromUsername: currentUser.username,
      fromDisplayName: currentUser.displayName,
      fromAvatarUrl: currentUser.avatarUrl || '',
      toUserId: targetUser.id,
      toUsername: targetUser.username,
      toDisplayName: targetUser.displayName,
      toAvatarUrl: targetUser.avatarUrl || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `friendRequests/${requestId}`);
  }
}

/**
 * Cancel a pending outgoing Friend Request
 */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  const reqRef = doc(db, 'friendRequests', requestId);
  try {
    await deleteDoc(reqRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `friendRequests/${requestId}`);
  }
}

/**
 * Accept Friend Request: updates request status and creates mutual contacts
 */
export async function acceptFriendRequest(
  request: FriendRequest,
  currentUser: User
): Promise<Contact> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  // 1. Mark request accepted
  const reqRef = doc(db, 'friendRequests', request.id);
  batch.update(reqRef, {
    status: 'accepted',
    updatedAt: now,
  });

  // 2. Add sender as contact for current user
  const myContactRef = doc(db, 'users', currentUser.id, 'contacts', request.fromUserId);
  const newContact: Contact = {
    id: request.fromUserId,
    username: request.fromUsername,
    displayName: request.fromDisplayName,
    avatarUrl: request.fromAvatarUrl,
    bio: '',
    status: 'offline',
    lastSeen: 'Recently',
  };

  batch.set(myContactRef, {
    contactUserId: request.fromUserId,
    username: request.fromUsername,
    displayName: request.fromDisplayName,
    avatarUrl: request.fromAvatarUrl || '',
    bio: '',
    createdAt: now,
  });

  // 3. Add current user as contact for the sender
  const theirContactRef = doc(db, 'users', request.fromUserId, 'contacts', currentUser.id);
  batch.set(theirContactRef, {
    contactUserId: currentUser.id,
    username: currentUser.username,
    displayName: currentUser.displayName,
    avatarUrl: currentUser.avatarUrl || '',
    bio: currentUser.bio || '',
    createdAt: now,
  });

  try {
    await batch.commit();
    return newContact;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `friendRequests/${request.id}`);
  }
}

/**
 * Reject Friend Request
 */
export async function rejectFriendRequest(requestId: string): Promise<void> {
  const reqRef = doc(db, 'friendRequests', requestId);
  try {
    await updateDoc(reqRef, {
      status: 'rejected',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `friendRequests/${requestId}`);
  }
}

/**
 * Subscribe to incoming friend requests in realtime
 */
export function subscribeToFriendRequests(
  userId: string,
  onUpdate: (requests: FriendRequest[]) => void
): () => void {
  if (!auth.currentUser || !userId || auth.currentUser.uid !== userId) {
    return () => {};
  }

  const path = 'friendRequests';
  const q = query(
    collection(db, path),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests: FriendRequest[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        requests.push({
          id: d.id,
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername,
          fromDisplayName: data.fromDisplayName,
          fromAvatarUrl: data.fromAvatarUrl,
          toUserId: data.toUserId,
          toUsername: data.toUsername,
          toDisplayName: data.toDisplayName,
          toAvatarUrl: data.toAvatarUrl,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      onUpdate(requests);
    },
    (error) => {
      if (auth.currentUser && auth.currentUser.uid === userId) {
        handleFirestoreError(error, OperationType.GET, path);
      } else {
        console.warn('Friend requests subscription ended:', error);
      }
    }
  );
}

/**
 * Subscribe to outgoing friend requests in realtime
 */
export function subscribeToOutgoingFriendRequests(
  userId: string,
  onUpdate: (requests: FriendRequest[]) => void
): () => void {
  if (!auth.currentUser || !userId || auth.currentUser.uid !== userId) {
    return () => {};
  }

  const path = 'friendRequests';
  const q = query(
    collection(db, path),
    where('fromUserId', '==', userId),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests: FriendRequest[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        requests.push({
          id: d.id,
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername,
          fromDisplayName: data.fromDisplayName,
          fromAvatarUrl: data.fromAvatarUrl,
          toUserId: data.toUserId,
          toUsername: data.toUsername,
          toDisplayName: data.toDisplayName,
          toAvatarUrl: data.toAvatarUrl,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      onUpdate(requests);
    },
    (error) => {
      if (auth.currentUser && auth.currentUser.uid === userId) {
        handleFirestoreError(error, OperationType.GET, path);
      } else {
        console.warn('Outgoing requests subscription ended:', error);
      }
    }
  );
}

/**
 * Update authenticated user's online/offline presence in Firestore
 */
export async function setUserPresence(userId: string, status: 'online' | 'offline' | 'away'): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status,
      lastSeen: status === 'online' ? 'Active now' : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Non-fatal presence sync
  }
}

/**
 * Subscribe to current user's contacts in realtime with actual presence
 */
export function subscribeToContacts(
  userId: string,
  onUpdate: (contacts: Contact[]) => void
): () => void {
  if (!auth.currentUser || !userId || auth.currentUser.uid !== userId) {
    return () => {};
  }

  const path = `users/${userId}/contacts`;
  const colRef = collection(db, 'users', userId, 'contacts');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      const contactItems: Contact[] = [];
      const fetchPromises: Promise<void>[] = [];

      snapshot.forEach((d) => {
        const data = d.data();
        const contactObj: Contact = {
          id: d.id,
          username: data.username,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl || '',
          bio: data.bio || '',
          status: 'offline',
          lastSeen: 'Recently',
        };
        contactItems.push(contactObj);

        // Fetch live user status & avatar from users/{id}
        fetchPromises.push(
          getDoc(doc(db, 'users', d.id))
            .then((uSnap) => {
              if (uSnap.exists()) {
                const uData = uSnap.data();
                contactObj.displayName = uData.displayName || contactObj.displayName;
                contactObj.avatarUrl = uData.avatarUrl || contactObj.avatarUrl;
                contactObj.bio = uData.bio || contactObj.bio;
                contactObj.status = uData.status || 'offline';
                contactObj.lastSeen = uData.status === 'online' ? 'Active now' : (uData.lastSeen || 'Recently');
              }
            })
            .catch(() => {
              // ignore
            })
        );
      });

      if (fetchPromises.length > 0) {
        await Promise.all(fetchPromises);
      }
      onUpdate(contactItems);
    },
    (error) => {
      if (auth.currentUser && auth.currentUser.uid === userId) {
        handleFirestoreError(error, OperationType.GET, path);
      } else {
        console.warn('Contacts subscription ended:', error);
      }
    }
  );
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

/**
 * Sign out
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Generate deterministic conversation ID for 1:1 chat
 */
export function getConversationId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Send a message in a 1:1 conversation and update conversation metadata
 */
export async function sendMessageToFirestore(
  conversationId: string,
  sender: User,
  recipient: Contact,
  text: string,
  type: 'text' | 'voice' | 'image' = 'text',
  voiceDuration?: number
): Promise<Message> {
  const now = new Date().toISOString();
  const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const messageData: Message = {
    id: messageId,
    conversationId,
    senderId: sender.id,
    text,
    timestamp: timeString,
    status: 'sent',
    type,
    voiceDuration,
  };

  const convDocRef = doc(db, 'conversations', conversationId);
  const msgDocRef = doc(db, 'conversations', conversationId, 'messages', messageId);

  const batch = writeBatch(db);

  // Set the message document
  batch.set(msgDocRef, {
    id: messageId,
    conversationId,
    senderId: sender.id,
    senderUsername: sender.username,
    text,
    type,
    voiceDuration: voiceDuration || null,
    status: 'sent',
    createdAt: now,
  });

  // Fetch current unread count for recipient if conversation exists
  let currentUnread = 0;
  try {
    const convSnap = await getDoc(convDocRef);
    if (convSnap.exists()) {
      const data = convSnap.data();
      currentUnread = (data.unreadCounts?.[recipient.id] || 0) + 1;
    } else {
      currentUnread = 1;
    }
  } catch {
    currentUnread = 1;
  }

  // Update or initialize conversation document
  batch.set(
    convDocRef,
    {
      id: conversationId,
      participants: [sender.id, recipient.id],
      participantDetails: {
        [sender.id]: {
          displayName: sender.displayName,
          username: sender.username,
          avatarUrl: sender.avatarUrl || '',
          bio: sender.bio || '',
        },
        [recipient.id]: {
          displayName: recipient.displayName,
          username: recipient.username,
          avatarUrl: recipient.avatarUrl || '',
          bio: recipient.bio || '',
        },
      },
      lastMessage: {
        id: messageId,
        text,
        senderId: sender.id,
        senderUsername: sender.username,
        timestamp: timeString,
        type,
        voiceDuration: voiceDuration || null,
        createdAt: now,
      },
      unreadCounts: {
        [sender.id]: 0,
        [recipient.id]: currentUnread,
      },
      updatedAt: now,
    },
    { merge: true }
  );

  try {
    await batch.commit();
    return messageData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${conversationId}/messages/${messageId}`);
  }
}

/**
 * Subscribe to all 1:1 conversations for a user
 */
export function subscribeToConversations(
  userId: string,
  onUpdate: (conversations: Conversation[]) => void
): () => void {
  if (!auth.currentUser || !userId || auth.currentUser.uid !== userId) {
    return () => {};
  }

  const path = 'conversations';
  const q = query(
    collection(db, path),
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const convList: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const otherParticipantId = data.participants?.find((id: string) => id !== userId);
        const details = data.participantDetails?.[otherParticipantId] || {};

        const participant: Contact = {
          id: otherParticipantId || 'contact',
          username: details.username || '@user',
          displayName: details.displayName || 'Friend',
          avatarUrl: details.avatarUrl || '',
          bio: details.bio || '',
          status: details.status || 'offline',
          lastSeen: details.status === 'online' ? 'Active now' : (details.lastSeen || 'Recently'),
        };

        const lastMsg = data.lastMessage
          ? {
              id: data.lastMessage.id,
              conversationId: docSnap.id,
              senderId: data.lastMessage.senderId === userId ? 'me' : data.lastMessage.senderId,
              text: data.lastMessage.text,
              timestamp: data.lastMessage.timestamp || 'Recently',
              status: 'read' as const,
              type: data.lastMessage.type || 'text',
              voiceDuration: data.lastMessage.voiceDuration || undefined,
            }
          : undefined;

        convList.push({
          id: docSnap.id,
          participant,
          lastMessage: lastMsg,
          unreadCount: data.unreadCounts?.[userId] || 0,
          pinned: false,
        });
      });

      // Sort by last message or updated timestamp
      convList.sort((a, b) => {
        return (b.lastMessage?.id ? 1 : 0) - (a.lastMessage?.id ? 1 : 0);
      });

      onUpdate(convList);
    },
    (error) => {
      if (auth.currentUser && auth.currentUser.uid === userId) {
        handleFirestoreError(error, OperationType.GET, path);
      } else {
        console.warn('Conversations subscription ended:', error);
      }
    }
  );
}

/**
 * Subscribe to messages in a specific conversation
 */
export function subscribeToMessages(
  conversationId: string,
  currentUserId: string,
  onUpdate: (messages: Message[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!auth.currentUser || !conversationId) {
    return () => {};
  }

  const path = `conversations/${conversationId}/messages`;
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        messages.push({
          id: d.id || docSnap.id,
          conversationId,
          senderId: d.senderId === currentUserId ? 'me' : d.senderId,
          text: d.text,
          timestamp: d.createdAt
            ? new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now',
          status: d.status || 'read',
          type: d.type || 'text',
          voiceDuration: d.voiceDuration || undefined,
        });
      });
      onUpdate(messages);
    },
    (error) => {
      if (auth.currentUser) {
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
        handleFirestoreError(error, OperationType.GET, path);
      } else {
        console.warn('Messages subscription ended:', error);
      }
    }
  );
}

/**
 * Reset unread count for user in conversation
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  if (!auth.currentUser || !conversationId) return;
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      [`unreadCounts.${userId}`]: 0,
    });
  } catch (error) {
    // If doc does not exist yet or offline, silent catch
    console.warn('Could not reset unread count:', error);
  }
}

