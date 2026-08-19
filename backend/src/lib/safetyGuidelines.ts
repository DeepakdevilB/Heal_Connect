/**
 * Safety guidelines and content policy for HealConnect.
 *
 * These texts are returned to the client when initiating sessions and chats
 * so the frontend can display them before the call/chat begins.
 *
 * Task 6: Safety guidelines layer.
 */

export interface SafetyGuidelines {
  title: string;
  version: string;
  disclaimer: string;
  rules: string[];
  emergencyNote: string;
}

/**
 * Guidelines shown to users before starting any session (call or chat).
 */
export const SESSION_SAFETY_GUIDELINES: SafetyGuidelines = {
  title: 'HealConnect Community Safety Guidelines',
  version: '1.0',
  disclaimer:
    'HealConnect connects you with wellness practitioners for general guidance and support. ' +
    'Sessions on this platform are NOT a substitute for emergency medical care, crisis intervention, ' +
    'or licensed clinical therapy. Practitioners cannot prescribe medication or provide diagnoses.',
  rules: [
    'Do not share personal contact information (phone numbers, email, social media) during sessions. ' +
      'All communication must remain on the HealConnect platform.',
    'Treat all participants with respect. Harassment, hate speech, or threatening language is strictly prohibited.',
    'Do not record sessions without the express consent of all participants.',
    'Practitioners provide wellness guidance only — they are not crisis counselors.',
    'HealConnect monitors sessions for safety policy violations and may flag content for human review.',
  ],
  emergencyNote:
    'If you or someone you know is in immediate danger or experiencing a mental health crisis, ' +
    'please contact emergency services (112 in India) or iCall (9152987821) immediately.',
};

/**
 * Short disclaimer appended to session initiation API responses.
 * Frontend should display this before the user enters the call/chat room.
 */
export const SESSION_DISCLAIMER =
  'By joining this session you agree to HealConnect\'s Community Safety Guidelines. ' +
  'Do not share phone numbers or personal contact details in-session. ' +
  'This platform is for wellness support only — not emergency care.';

/**
 * Content categories that are flagged for human review (not auto-blocked).
 * Exported so they can be referenced in admin tooling / documentation.
 */
export const FLAGGED_CATEGORIES = {
  PHONE_NUMBER: 'Possible off-platform contact attempt (phone number detected)',
  OFF_PLATFORM_CONTACT: 'Attempt to take communication off the platform',
  HARASSMENT: 'Threatening or harassing language detected',
  SELF_HARM: 'Self-harm or suicidal ideation mention detected — requires human review',
} as const;
