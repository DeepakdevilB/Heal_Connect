import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FEMALE_AI_AVATARS = [
  '/avatars/astrologer_1.jpg',
  '/avatars/astrologer_3.jpg',
  '/avatars/astrologer_6.jpg',
];

const MALE_AI_AVATARS = [
  '/avatars/astrologer_2.jpg',
  '/avatars/astrologer_4.jpg',
  '/avatars/astrologer_5.jpg',
];

const ALL_AI_AVATARS = [
  '/avatars/astrologer_1.jpg',
  '/avatars/astrologer_2.jpg',
  '/avatars/astrologer_3.jpg',
  '/avatars/astrologer_4.jpg',
  '/avatars/astrologer_5.jpg',
  '/avatars/astrologer_6.jpg',
];

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

  const str = name || 'Astrologer';
  const lower = str.toLowerCase();

  // Detect male names / titles
  const isMale =
    lower.includes('michael') ||
    lower.includes('chen') ||
    lower.includes('rahul') ||
    lower.includes('david') ||
    lower.includes('john') ||
    lower.includes('arjun') ||
    lower.includes('vikram') ||
    lower.includes('raj') ||
    lower.includes('amit') ||
    lower.includes('sharma') ||
    lower.includes('pt.') ||
    lower.includes('pandit');

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  if (isMale) {
    const idx = Math.abs(hash) % MALE_AI_AVATARS.length;
    return MALE_AI_AVATARS[idx]!;
  }

  const isFemale =
    lower.includes('priya') ||
    lower.includes('ananya') ||
    lower.includes('sarah') ||
    lower.includes('sunita') ||
    lower.includes('dr. m') ||
    lower.includes('meenakshi') ||
    lower.includes('pooja') ||
    lower.includes('divya');

  if (isFemale) {
    const idx = Math.abs(hash) % FEMALE_AI_AVATARS.length;
    return FEMALE_AI_AVATARS[idx]!;
  }

  const idx = Math.abs(hash) % ALL_AI_AVATARS.length;
  return ALL_AI_AVATARS[idx]!;
}
