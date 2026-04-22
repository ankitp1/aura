export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  referenceSelfieUrl?: string;
  onboardingComplete: boolean;
  seenPitch?: boolean;
  createdAt: string;
}

export interface WardrobeItem {
  id: string;
  userId: string;
  imageUrl: string;
  originalPhotoUrl?: string;
  category: string;
  tags: string[];
  versatilityScore: number;
  vibe?: string;
  isArchived: boolean;
  isApproved: boolean;
  isAvailable?: boolean; // True by default. If false, it's "in the wash" or unavailable.
  color?: string;
  createdAt: number;
}

export interface Outfit {
  id?: string;
  name: string;
  items: string[];
  explanation: string;
  createdAt: number;
}

export interface HarvestSession {
  id: string;
  userId: string;
  status: 'processing' | 'completed' | 'failed';
  foundItemsCount: number;
  timeWindow: string;
  createdAt: number;
}

export interface GooglePhotoItem {
  id: string;
  baseUrl: string;
  mimeType: string;
  mediaMetadata: {
    creationTime: string;
    width: string;
    height: string;
  };
  filename: string;
}
