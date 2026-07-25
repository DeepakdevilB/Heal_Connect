import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a deterministic local avatar path for a practitioner.
 * Maps practitioner to one of 6 real avatar images based on their ID.
 * If photoUrl is already a local path (starts with /), returns as-is.
 */
const LOCAL_AVATARS = [
  '/avatars/astrologer_1.jpg',
  '/avatars/astrologer_2.jpg',
  '/avatars/astrologer_3.jpg',
  '/avatars/astrologer_4.jpg',
  '/avatars/astrologer_5.jpg',
  '/avatars/astrologer_6.jpg',
];

export function getPractitionerAvatar(photoUrl: string | null, id: string): string {
  // If already a local path, use it
  if (photoUrl && photoUrl.startsWith('/')) return photoUrl;
  // Deterministic mapping based on ID
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return LOCAL_AVATARS[hash % LOCAL_AVATARS.length];
}
