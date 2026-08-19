import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const defaultAvatarSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E`;

export function getAvatarUrl(name?: string | null, photoUrl?: string | null): string {
  // Respect valid custom photo URLs
  if (
    photoUrl &&
    (photoUrl.startsWith('/') || photoUrl.startsWith('http')) &&
    !photoUrl.includes('dicebear') &&
    !photoUrl.includes('robohash') &&
    !photoUrl.includes('multiavatar') &&
    !photoUrl.includes('githubusercontent') &&
    !photoUrl.includes('ui-avatars.com') &&
    !photoUrl.includes('svg')
  ) {
    return photoUrl;
  }
  return defaultAvatarSvg;
}

export function getPractitionerAvatar(photoUrl: string | null | undefined, name: string = 'Expert'): string {
  if (
    photoUrl &&
    (photoUrl.startsWith('/') || photoUrl.startsWith('http')) &&
    !photoUrl.includes('dicebear') &&
    !photoUrl.includes('ui-avatars.com')
  ) {
    return photoUrl;
  }
  return defaultAvatarSvg;
}
