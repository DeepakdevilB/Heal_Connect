import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAvatarUrl(name?: string | null, photoUrl?: string | null): string {
  // Respect valid custom photo URLs
  if (
    photoUrl &&
    (photoUrl.startsWith('/') || photoUrl.startsWith('http')) &&
    !photoUrl.includes('dicebear') &&
    !photoUrl.includes('robohash') &&
    !photoUrl.includes('multiavatar') &&
    !photoUrl.includes('githubusercontent') &&
    !photoUrl.includes('svg')
  ) {
    return photoUrl;
  }

  const str = name || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(str)}&background=random&color=fff`;
}

export function getPractitionerAvatar(photoUrl: string | null | undefined, name: string = 'Expert'): string {
  if (photoUrl && (photoUrl.startsWith('/') || photoUrl.startsWith('http'))) return photoUrl;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
}
