'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, SlidersHorizontal, X, ChevronDown, ChevronUp, Star,
  Heart, Briefcase, Coins, Activity, Brain, Compass, Sparkles,
  ArrowRight, Shield, MessageSquare, BookOpen, Check, Info,
  TrendingUp, RefreshCw, Zap, ChevronRight
} from 'lucide-react';
import Navbar from '@/components/navbar';

// --- ZODIAC DATA ---
interface ZodiacSign {
  name: string;
  icon: string;
  dates: string;
  element: string;
  planet: string;
  image?: string;
  prediction: {
    general: string;
    love: string;
    career: string;
    finance: string;
    health: string;
    education: string;
    spiritual: string;
  };
  insights: {
    luckyNumber: number;
    luckyColor: string;
    mood: string;
    energy: string;
    bestTime: string;
    compatibleSign: string;
    affirmation: string;
  };
}

const ZODIAC_SIGNS: ZodiacSign[] = [
  {
    name: 'Aries',
    icon: '♈',
    image: '/zodiac/aries.jpg',
    dates: 'Mar 21 – Apr 19',
    element: 'Fire',
    planet: 'Mars',
    prediction: {
      general: 'Today brings a surge of initiative and confidence. You feel ready to take on new challenges and clear away long-standing projects. Trust your instincts, but avoid impulsive decisions in crucial matters.',
      love: 'Romance flourishes when you show vulnerability. Let your guard down and communicate openly with your partner or crush. A heart-to-heart talk could spark a deeper connection.',
      career: 'Your leadership qualities are highlighted today. It is an excellent time to propose new strategies or spearhead a collaborative project. Superiors are paying attention.',
      finance: 'Be mindful of spontaneous purchases. While your cash flow is steady, a disciplined savings plan will serve you better in the coming weeks. Avoid high-risk investments today.',
      health: 'High energy levels make this a great day for an intense workout or a brisk outdoor walk. Stay hydrated and ensure you match your active day with deep restful sleep.',
      education: 'Your analytical skills are exceptionally sharp today. Complex concepts will resolve themselves easily with dedicated study. Take breaks to avoid burnout.',
      spiritual: 'Connect with your inner flame. Meditation focused on the solar plexus chakra will amplify your spiritual strength and sense of purpose.'
    },
    insights: {
      luckyNumber: 9,
      luckyColor: 'Crimson Red',
      mood: 'Enthusiastic',
      energy: '92%',
      bestTime: '9:00 AM - 10:30 AM',
      compatibleSign: 'Leo',
      affirmation: 'I act with strength, courage, and clear intention.'
    }
  },
  {
    name: 'Taurus',
    icon: '♉',
    image: '/zodiac/taurus.jpg',
    dates: 'Apr 20 – May 20',
    element: 'Earth',
    planet: 'Venus',
    prediction: {
      general: 'Stability and focus are your primary strengths today. Take a step-by-step approach to tasks, ensuring that details are completely resolved. Nourish your connection to nature.',
      love: 'Sensory pleasures and sweet gestures will enhance your relationship. Cook a cozy meal together or surprise your partner with a thoughtful token of appreciation.',
      career: 'Patience pays off in professional situations. A project that seemed stalled will start moving forward. Your attention to detail is highly appreciated.',
      finance: 'Practical financial planning shows positive results. It is an excellent day to review long-term investments, real estate options, or retirement plans.',
      health: 'Focus on alignment and stretching. Gentle yoga or massage will relieve tension accumulated in the neck and shoulders. Eat wholesome, organic foods.',
      education: 'Steady, persistent study yields the best results today. Avoid cramming; instead, review your material systematically and create structured summaries.',
      spiritual: 'Ground your energy. Place your bare feet on the earth or hold a grounding crystal like hematite to restore balance and calm your mind.'
    },
    insights: {
      luckyNumber: 6,
      luckyColor: 'Emerald Green',
      mood: 'Determined',
      energy: '85%',
      bestTime: '2:00 PM - 3:30 PM',
      compatibleSign: 'Virgo',
      affirmation: 'I am grounded, secure, and surrounded by abundance.'
    }
  },
  {
    name: 'Gemini',
    icon: '♊',
    image: '/zodiac/gemini.jpg',
    dates: 'May 21 – Jun 20',
    element: 'Air',
    planet: 'Mercury',
    prediction: {
      general: 'Your mind is buzzing with ideas and your social charm is irresistible. It is a perfect day for networking, sharing insights, and expressing your creative thoughts.',
      love: 'Playful banter and intellectual connection are highlighted. Share a book, article, or interesting concept with your partner. Single Geminis might find attraction in a conversation.',
      career: 'Excellent day for negotiations, presentations, and marketing. Your communication skills allow you to persuade others effortlessly. Stay organized to avoid scattered energy.',
      finance: 'A new opportunity for a side income might present itself through a conversation. Research carefully before committing any capital.',
      health: 'Keep your nervous system calm. Avoid excess caffeine and practice mindful breathing exercises if you feel overwhelmed by thoughts.',
      education: 'Your curiosity is peaked. You will excel in subjects requiring creative thinking, writing, and language. Excellent day for group projects.',
      spiritual: 'Calm the mental chatter. Meditation using a mantra will help focus your active mind and connect you to your higher intuition.'
    },
    insights: {
      luckyNumber: 5,
      luckyColor: 'Bright Yellow',
      mood: 'Witty & Curious',
      energy: '90%',
      bestTime: '11:00 AM - 12:30 PM',
      compatibleSign: 'Libra',
      affirmation: 'My mind is clear, and I communicate my truth with ease.'
    }
  },
  {
    name: 'Cancer',
    icon: '♋',
    image: '/zodiac/cancer.jpg',
    dates: 'Jun 21 – Jul 22',
    element: 'Water',
    planet: 'Moon',
    prediction: {
      general: 'Intuition guides you beautifully today. Trust your inner feelings when making choices, especially regarding home, family, and close relationships.',
      love: 'Nurture your emotional bond. Create a warm, quiet atmosphere at home to share your deepest feelings. Your vulnerability will strengthen your partnership.',
      career: 'Your empathetic approach makes you a supportive team member. You are able to resolve workplace conflicts with gentleness and understanding.',
      finance: 'Focus on securing your foundations. It is a good day to budget for household enhancements or save for future family security.',
      health: 'Pay attention to your emotional digestion. Eat light, comforting meals and take time to rest. A warm bath will work wonders for stress relief.',
      education: 'Study in a quiet, comfortable environment. You absorb information best when you feel emotionally secure and free from distractions.',
      spiritual: 'Honor your emotional cycles. A water-based meditation or connecting near water will cleanse your auric field and refresh your spirit.'
    },
    insights: {
      luckyNumber: 2,
      luckyColor: 'Silver Pearl',
      mood: 'Intuitive & Empathetic',
      energy: '80%',
      bestTime: '7:00 PM - 8:30 PM',
      compatibleSign: 'Scorpio',
      affirmation: 'I trust my feelings and honor my emotional waves.'
    }
  },
  {
    name: 'Leo',
    icon: '♌',
    image: '/zodiac/leo.jpg',
    dates: 'Jul 23 – Aug 22',
    element: 'Fire',
    planet: 'Sun',
    prediction: {
      general: 'Your natural radiance attracts positive energy. Today is a day to express yourself fully, create art, and share your warmth and joy with those around you.',
      love: 'Generous expressions of love make your partner feel cherished. If single, your magnetic presence makes you stand out in any social gathering.',
      career: 'Showcase your creative talents. Do not hesitate to take the spotlight during meetings. Your confidence inspires trust in clients and colleagues alike.',
      finance: 'Financial prospects are looking bright. You might receive appreciation, bonuses, or a new client request. Spend wisely on things that bring true value.',
      health: 'Focus on cardiovascular health. An active workout, dancing, or sports will boost your blood circulation and keep you energized.',
      education: 'Your confidence is high, helping you face exams or presentations with ease. Support peers who might be struggling with complex concepts.',
      spiritual: 'Radiate love. A meditation focusing on sending loving-kindness (Metta) to all beings will align you with the infinite source of light.'
    },
    insights: {
      luckyNumber: 1,
      luckyColor: 'Golden Amber',
      mood: 'Radiant & Proud',
      energy: '95%',
      bestTime: '12:00 PM - 1:30 PM',
      compatibleSign: 'Aries',
      affirmation: 'I shine my light brightly and inspire those around me.'
    }
  },
  {
    name: 'Virgo',
    icon: '♍',
    image: '/zodiac/virgo.jpg',
    dates: 'Aug 23 – Sep 22',
    element: 'Earth',
    planet: 'Mercury',
    prediction: {
      general: 'Your organizing skills and mental clarity are top-tier today. Use this day to streamline your routines, tidy your workspace, and resolve complex issues.',
      love: 'Acts of service are your love language today. Help your partner with a task or organize something to show you care. Quiet appreciation builds trust.',
      career: 'Your analytical precision helps you identify errors before they become problems. Excellent day for editing, planning, and systematic research.',
      finance: 'A highly structured approach to budgeting brings peace of mind. Audit your expenses and eliminate unnecessary subscriptions.',
      health: 'Focus on digestive health. Incorporate fiber-rich foods, probiotics, and warm herbal teas. Practice mindfulness to ease a busy mind.',
      education: 'Perfect day for learning detailed subjects, writing structured research papers, or organizing your notes for upcoming assessments.',
      spiritual: 'Find sacredness in the details. Walking meditation, gardening, or a mindful organizing session can be deeply meditative activities today.'
    },
    insights: {
      luckyNumber: 7,
      luckyColor: 'Forest Green',
      mood: 'Analytical & Calming',
      energy: '87%',
      bestTime: '10:00 AM - 11:30 AM',
      compatibleSign: 'Taurus',
      affirmation: 'I create order, peace, and harmony in my life.'
    }
  },
  {
    name: 'Libra',
    icon: '♎',
    image: '/zodiac/libra.jpg',
    dates: 'Sep 23 – Oct 22',
    element: 'Air',
    planet: 'Venus',
    prediction: {
      general: 'Harmony and balance are your guiding stars today. You are able to see multiple perspectives clearly, making you a wonderful mediator and companion.',
      love: 'A beautiful day for partnership. Focus on mutual decisions and balance. Sharing a cultural experience like music or art will elevate your romance.',
      career: 'Collaborative projects are highly favored. Your diplomacy helps resolve conflicts and unites team members around a common objective.',
      finance: 'Maintain balance in your spending. Avoid impulse purchases; instead, invest in high-quality items that represent artistic value or stability.',
      health: 'Focus on kidney and lower back health. Drink plenty of water and practice gentle lower back stretching to release built-up tension.',
      education: 'Group studies will be highly beneficial. Sharing viewpoints and debating topics helps clarify complex theories easily.',
      spiritual: 'Focus on balance. An alternate nostril breathing practice (Nadi Shodhana) will balance your masculine and feminine energies perfectly.'
    },
    insights: {
      luckyNumber: 8,
      luckyColor: 'Rose Pink',
      mood: 'Harmonious & Peaceful',
      energy: '83%',
      bestTime: '4:00 PM - 5:30 PM',
      compatibleSign: 'Gemini',
      affirmation: 'I bring balance, beauty, and peace to every situation.'
    }
  },
  {
    name: 'Scorpio',
    icon: '♏',
    image: '/zodiac/scorpio.jpg',
    dates: 'Oct 23 – Nov 21',
    element: 'Water',
    planet: 'Pluto',
    prediction: {
      general: 'Deep emotional insight and determination are yours today. You have the power to transform challenging situations into growth opportunities.',
      love: 'Intensity and passion define your relationship today. Honest communication about deep desires and fears brings you closer to your partner.',
      career: 'Your focus is absolute. You are able to dive deep into research or solve problems that others found too challenging. Trust your analytical instincts.',
      finance: 'Research investment opportunities thoroughly. Hidden assets or old debts could yield positive financial results today.',
      health: 'Detoxify your body. Hydrate well, consume green juices, and engage in sweat-inducing exercises to clear out physical toxins.',
      education: 'You excel in subjects requiring investigative work, psychology, or deep scientific analysis. Your concentration is unshakeable.',
      spiritual: 'Embrace transformation. A meditation focused on releasing old patterns will cleanse your aura and prepare you for new energy.'
    },
    insights: {
      luckyNumber: 4,
      luckyColor: 'Deep Burgundy',
      mood: 'Intense & Focused',
      energy: '89%',
      bestTime: '8:00 PM - 9:30 PM',
      compatibleSign: 'Cancer',
      affirmation: 'I welcome change and transform challenges into power.'
    }
  },
  {
    name: 'Sagittarius',
    icon: '♐',
    image: '/zodiac/sagittarius.jpg',
    dates: 'Nov 22 – Dec 21',
    element: 'Fire',
    planet: 'Jupiter',
    prediction: {
      general: 'Adventure and optimism fill your spirit. It is a wonderful day to explore new ideas, step out of your comfort zone, and expand your horizons.',
      love: 'Share exciting experiences with your partner. Travel, try new cuisines, or plan an outdoor adventure. If single, look for love in new environments.',
      career: 'Your big-picture vision is highly valuable. Share your long-term strategies and innovative concepts during meetings. Your enthusiasm is contagious.',
      finance: 'Financial growth comes through calculated risks and expansion. Keep an eye out for opportunities related to foreign markets or education.',
      health: 'Focus on thigh and hip flexibility. Running, hiking, or yoga poses like Pigeon Pose will release stored emotional tension.',
      education: 'You learn best when connecting theories to real-world applications. Perfect day for philosophy, history, or global studies.',
      spiritual: 'Connect with the divine quest. A meditation under the open sky will amplify your connection to the cosmos and inner wisdom.'
    },
    insights: {
      luckyNumber: 3,
      luckyColor: 'Royal Purple',
      mood: 'Adventurous',
      energy: '94%',
      bestTime: '8:00 AM - 9:30 AM',
      compatibleSign: 'Aries',
      affirmation: 'I trust the universe and expand my horizons daily.'
    }
  },
  {
    name: 'Capricorn',
    icon: '♑',
    image: '/zodiac/capricorn.jpg',
    dates: 'Dec 22 – Jan 19',
    element: 'Earth',
    planet: 'Saturn',
    prediction: {
      general: 'Dedication, structure, and professional discipline are your key themes today. Your steady effort builds a foundation that will withstand time.',
      love: 'Commitment and loyalty are highlighted. Show your partner they can count on you through practical support and keeping your promises.',
      career: 'Your hard work and structure are noticed by superiors. A great day to lay out organizational plans, timelines, and budgets.',
      finance: 'Conservative financial choices are highly favored. Focus on steady accumulation, reducing debt, and low-risk investments.',
      health: 'Pay attention to your joints, knees, and bones. Ensure adequate calcium intake and engage in low-impact exercises like swimming.',
      education: 'Your focus and self-discipline allow you to study dry or difficult subjects effectively. Create structural outlines and stick to your schedule.',
      spiritual: 'Respect the wisdom of time. Meditate on patience, structure, and honoring your ancestors to ground your spiritual progress.'
    },
    insights: {
      luckyNumber: 10,
      luckyColor: 'Charcoal Grey',
      mood: 'Disciplined',
      energy: '88%',
      bestTime: '3:00 PM - 4:30 PM',
      compatibleSign: 'Taurus',
      affirmation: 'I build my dreams with patience, discipline, and integrity.'
    }
  },
  {
    name: 'Aquarius',
    icon: '♒',
    image: '/zodiac/aquarius.jpg',
    dates: 'Jan 20 – Feb 18',
    element: 'Air',
    planet: 'Uranus',
    prediction: {
      general: 'Your unique insights and humanitarian vision are highlighted today. Connect with community efforts and think outside the box to solve problems.',
      love: 'Equality and intellectual friendship form the basis of your romance today. Share your dreams for the future and collaborative ideas.',
      career: 'Innovative ideas find support. Introduce technological solutions or process improvements. Collaborative brainstorming is highly productive.',
      finance: 'Invest in technology or alternative energy options. Be open to unconventional sources of income or digital collaborations.',
      health: 'Focus on shin and ankle health. Take walks, perform ankle rotations, and keep your circulation active with light exercises.',
      education: 'You excel in subjects involving modern technology, science, coding, or sociology. Your unique style of thinking stands out.',
      spiritual: 'Connect with universal consciousness. A meditation focused on humanity as one family will elevate your spiritual alignment.'
    },
    insights: {
      luckyNumber: 11,
      luckyColor: 'Electric Blue',
      mood: 'Innovative',
      energy: '91%',
      bestTime: '5:00 PM - 6:30 PM',
      compatibleSign: 'Gemini',
      affirmation: 'I embrace my uniqueness and contribute to the collective good.'
    }
  },
  {
    name: 'Pisces',
    icon: '♓',
    image: '/zodiac/pisces.jpg',
    dates: 'Feb 19 – Mar 20',
    element: 'Water',
    planet: 'Neptune',
    prediction: {
      general: 'Your imagination, creativity, and empathy are highly elevated today. You are deeply sensitive to the environment, so surround yourself with beauty and peace.',
      love: 'Poetic and romantic energy flows. Share your dreams, create music, or write letters to express your feelings. Empathy heals past wounds.',
      career: 'Your creative intuition helps you solve artistic or interpersonal issues. Excellent day for designers, musicians, healers, and writers.',
      finance: 'Trust your financial intuition, but verify details with a practical friend. Avoid signing contracts without clear advice.',
      health: 'Take care of your feet. Relax with a foot soak or massage. Ensure you get plenty of rest to recharge your psychic batteries.',
      education: 'You absorb concepts holistically. Visual maps, storytelling, and creative metaphors help you understand dry technical topics.',
      spiritual: 'Connect with the divine flow. A water meditation or listening to high-frequency sound waves will elevate your spiritual connection.'
    },
    insights: {
      luckyNumber: 12,
      luckyColor: 'Seafoam Green',
      mood: 'Dreamy & Artistic',
      energy: '82%',
      bestTime: '9:00 PM - 10:30 PM',
      compatibleSign: 'Cancer',
      affirmation: 'I flow with the ocean of life, guided by divine love.'
    }
  }
];

// --- MORE HOROSCOPES CATEGORIES ---
interface CategoryHoroscope {
  id: string;
  name: string;
  icon: string;
  desc: string;
  title: string;
  planetaryAspect: string;
  overview: string;
  guidance: string;
  dos: string[];
  donts: string[];
  affirmation: string;
  details?: string;
}

const CATEGORY_HOROSCOPES: CategoryHoroscope[] = [
  {
    id: 'love',
    name: 'Love Horoscope',
    icon: '❤️',
    desc: 'Deep romantic insights, relationship advice, and attraction forecasts.',
    title: 'Hearts in Alignment & Romantic Guidance',
    planetaryAspect: 'Venus Sextile Mars & Moon Transiting 5th House of Romance',
    overview: 'Today\'s celestial geometry brings a soft, harmonious resonance between Venus and Mars. Passion and emotional sensitivity merge gracefully, encouraging deep heart-to-heart conversations and renewed romantic spark. For couples, it is a prime window to resolve lingering misunderstandings, express heartfelt gratitude, and plan memorable intimate moments. For singles, magnetic attraction is heightened—openness in social or artistic settings will draw like-minded souls toward you.',
    guidance: 'Focus on genuine vulnerability rather than defensive pride. Express your desires with clarity and listen intently to your partner\'s unspoken feelings.',
    dos: [
      'Share your deepest feelings openly and transparently',
      'Plan a quiet, cozy evening or romantic artistic outing',
      'Practice active, empathetic listening with loved ones'
    ],
    donts: [
      'Do not bring up past grievances that were already resolved',
      'Avoid assuming your partner\'s feelings without asking'
    ],
    affirmation: 'My heart is open to giving and receiving pure, unconditional love.'
  },
  {
    id: 'career',
    name: 'Career Horoscope',
    icon: '💼',
    desc: 'Professional opportunities, leadership tasks, and productivity timing.',
    title: 'Path of Professional Mastery & Leadership',
    planetaryAspect: 'Mercury Trine Jupiter & Midheaven Power Alignment',
    overview: 'Mercury forms a favorable trine with Jupiter today, infusing your professional realm with persuasive clarity, foresight, and executive focus. It is an extraordinary day for high-stakes presentations, strategic negotiations, contract reviews, and pitching innovative proposals. Superiors and clients are exceptionally receptive to well-structured, data-backed ideas.',
    guidance: 'Take initiative on complex assignments you have been procrastinating on. Your analytical sharpness and professional charm will turn hurdles into milestones.',
    dos: [
      'Pitch new ideas with confidence and structured data',
      'Network with industry leaders and professional mentors',
      'Organize your workspace and schedule for peak efficiency'
    ],
    donts: [
      'Do not cut corners on legal or contractual details',
      'Avoid engaging in office politics or unverified gossip'
    ],
    affirmation: 'I lead with wisdom, clarity, and unshakeable professional confidence.'
  },
  {
    id: 'finance',
    name: 'Finance Horoscope',
    icon: '💰',
    desc: 'Wealth planning, budget auditing, and wise investment strategies.',
    title: 'Abundance, Wealth Security & Strategy',
    planetaryAspect: 'Saturn Sextile Sun & 2nd House Wealth Stability',
    overview: 'Saturn lends its grounding influence to your financial sector today, encouraging prudent wealth management, long-term asset security, and disciplined budgeting. Spontaneous impulse spending is discouraged under this transit; instead, direct your focus toward auditing recurring expenses, consolidating investments, and exploring sustainable passive income avenues.',
    guidance: 'Evaluate your financial goals over a 5-year horizon rather than short-term gains. Seeking counsel from trusted financial advisors will yield lucrative insights.',
    dos: [
      'Audit monthly subscriptions and unnecessary expenses',
      'Invest in long-term skill-building and stable assets',
      'Build or replenish your emergency financial reserve'
    ],
    donts: [
      'Avoid high-risk speculative trading or gambling today',
      'Do not make major financial purchases on emotional impulse'
    ],
    affirmation: 'Abundance flows to me naturally as I steward my resources with wisdom.'
  },
  {
    id: 'health',
    name: 'Health Horoscope',
    icon: '💚',
    desc: 'Body alignment, nutrition tips, and stress-relief guidance.',
    title: 'Vibrancy, Physical Alignment & Vitality',
    planetaryAspect: 'Solar Vitality Alignment & 6th House Wellness Transit',
    overview: 'Your physical body responds exceptionally well to restorative care and balanced movement today. High-intensity strain should be balanced with mindful warm-downs, proper hydration, and organic nutrient intake. Pay special attention to posture, joint flexibility, and digestive nourishment as your body integrates solar energy.',
    guidance: 'Listen closely to physical cues of fatigue. A 20-minute afternoon rest or grounding walk outdoors will recharge your stamina faster than stimulants.',
    dos: [
      'Hydrate thoroughly with clean, mineral-rich water',
      'Practice 15 minutes of spine and joint stretching',
      'Eat fresh, wholesome, nutrient-dense seasonal meals'
    ],
    donts: [
      'Do not ignore physical cues of fatigue or muscular tension',
      'Avoid excessive caffeine or refined processed sugars'
    ],
    affirmation: 'My body is a temple of strength, health, and radiant vitality.'
  },
  {
    id: 'mental',
    name: 'Mental Wellness Horoscope',
    icon: '🧠',
    desc: 'Calming the mind, anxiety management, and mindfulness schedules.',
    title: 'Inner Calm, Peace & Cognitive Balance',
    planetaryAspect: 'Neptune Trine Moon & 12th House Mindful Rest',
    overview: 'The planetary climate invites deep mental decongestion and emotional clearing today. If you have been carrying cognitive overload or nervous tension, this transit acts as a soothing balm. Establishing clear boundaries around work hours and digital screens will protect your aura and restore mental clarity.',
    guidance: 'Incorporate short 5-minute breathing pauses throughout your day. Journaling lingering thoughts before sleep will clear your subconscious mind.',
    dos: [
      'Take digital detox breaks between intensive work tasks',
      'Journal your thoughts and feelings without self-judgment',
      'Practice 4-7-8 calming breathwork whenever stressed'
    ],
    donts: [
      'Do not overcommit your personal time and energy today',
      'Avoid negative news feeds or doom-scrolling before bed'
    ],
    affirmation: 'My mind is quiet, serene, and anchored in peace.'
  },
  {
    id: 'spiritual',
    name: 'Spiritual Horoscope',
    icon: '🌙',
    desc: 'Intuition awakening, chakra balancing, and cosmic alignment.',
    title: 'Soul Purpose, Intuition & Cosmic Connection',
    planetaryAspect: 'Third Eye & Crown Chakra Planetary Harmonic',
    overview: 'Cosmic currents open a direct channel to your higher intuition and spiritual guide network today. Subtle synchronicities, vivid dreams, and intuitive flashes carry profound messages regarding your soul path. It is a sacred day for meditation, sound healing, crystal practices, and connecting with nature.',
    guidance: 'Trust the first intuitive impression you receive regarding decisions today. Higher wisdom speaks through quiet inner knowing rather than loud mental logic.',
    dos: [
      'Meditate under natural sunlight or open morning sky',
      'Record your dreams and intuitive insights in a journal',
      'Cleanse your sanctuary with sound waves or incense'
    ],
    donts: [
      'Do not dismiss subtle inner hunches or synchronicities',
      'Avoid chaotic, high-conflict environments today'
    ],
    affirmation: 'I am divinely connected, intuitively guided, and spiritually aligned.'
  },
  {
    id: 'weekly',
    name: 'Weekly Horoscope',
    icon: '📅',
    desc: 'Look ahead at the cosmic trends and cycles shaping your week.',
    title: 'Weekly Macro Cosmic Cycle & Growth',
    planetaryAspect: 'Lunar Phase Expansion & Solar House Transition',
    overview: 'This week represents a pivotal bridge between clearing past cycles and laying foundations for upcoming opportunities. The early days favor organization, auditing, and inner reflection, while mid-week unleashes dynamic creative momentum and social opportunities. By week\'s end, steady progress will yield tangible rewards.',
    guidance: 'Pace your energy rhythmically across the week. Treat challenges as constructive feedback rather than roadblocks.',
    dos: [
      'Map out top weekly priorities every Monday morning',
      'Balance independent focus with collaborative teamwork',
      'Acknowledge and celebrate small weekly milestones'
    ],
    donts: [
      'Do not rush critical long-term decisions midweek',
      'Avoid initiating too many fragmented tasks simultaneously'
    ],
    affirmation: 'I move effortlessly with the weekly rhythm of cosmic progress.'
  },
  {
    id: 'monthly',
    name: 'Monthly Horoscope',
    icon: '📆',
    desc: 'A complete overview of planetary transits and monthly themes.',
    title: 'Monthly Macro Overview & Transformational Forecast',
    planetaryAspect: 'Major Outer Planet Shift & Solar House Progression',
    overview: 'The overarching planetary movements for this month mark a major period of personal transformation and structural elevation. Major opportunities emerge in career visibility and personal relationships. Embrace necessary shifts with grace; outdated patterns are naturally dissolving to make room for aligned abundance.',
    guidance: 'Set clear 30-day intentions at the start of the month and review your progress weekly to maintain focus and momentum.',
    dos: [
      'Set 3 core intentions for the month ahead',
      'Review monthly financial budgets and major career goals',
      'Nurture key personal and professional relationships'
    ],
    donts: [
      'Do not fear necessary structural or routine shifts',
      'Avoid clinging to outdated habits that no longer serve you'
    ],
    affirmation: 'I welcome positive monthly growth and step into my fullest potential.'
  }
];

// --- EDUCATIONAL TOPICS ---
const EDUCATIONAL_TOPICS = [
  {
    title: 'Sun Sign (Your Core Identity)',
    desc: 'Calculated by the Sun\'s position at your birth. It represents your ego, core personality, and basic drive in life.'
  },
  {
    title: 'Moon Sign (Your Emotional Inner Self)',
    desc: 'Determined by the Moon\'s position. It governs your emotional responses, subconscious feelings, and how you nurture yourself.'
  },
  {
    title: 'Rising Sign / Ascendant (Your Outer Mask)',
    desc: 'The zodiac sign rising on the eastern horizon at the exact moment of your birth. It shows how you present yourself to the world.'
  },
  {
    title: 'Planetary Movements & Transits',
    desc: 'As planets travel through different signs, their combined energies shape the cosmic climate and influence daily events.'
  },
  {
    title: 'The Four Zodiac Elements',
    desc: 'Signs are grouped into Fire (passion), Earth (practicality), Air (intellect), and Water (emotion), defining their basic nature.'
  },
  {
    title: 'The Twelve Houses of Astrology',
    desc: 'Your natal chart is divided into 12 sections, each representing a specific area of life, from career to relationships.'
  }
];

// --- BENEFITS ---
const BENEFITS = [
  { title: 'Better Self-Awareness', desc: 'Understand your natural strengths, behavioral patterns, and emotional cycles.' },
  { title: 'Career Guidance', desc: 'Identify ideal timings for job changes, promotions, and creative ventures.' },
  { title: 'Relationship Clarity', desc: 'Understand communication styles and compatibility factors for smoother connections.' },
  { title: 'Financial Planning', desc: 'Align your wealth accumulation strategies with cosmic planetary support.' },
  { title: 'Mental Wellness', desc: 'Use cosmic cycles to plan times of high activity vs. deep restorative rest.' },
  { title: 'Positive Mindset', desc: 'Empower yourself daily with targeted affirmations and mental focus guides.' },
  { title: 'Spiritual Growth', desc: 'Deepen your meditation and chakra practices using planetary alignment.' }
];

// --- FAQS ---
const FAQS = [
  { q: 'What is a daily horoscope?', a: 'A daily horoscope is an astrological forecast based on the current positions of the Sun, Moon, and other planets, calculated to see how their energies interact with each of the 12 zodiac signs.' },
  { q: 'How accurate are horoscope predictions?', a: 'General daily horoscopes provide overall thematic trends. For highly precise personal predictions, we recommend getting a personalized Kundli Analysis from a verified expert based on your exact birth time and location.' },
  { q: 'How are HealConnect horoscopes generated?', a: 'HealConnect combines classical Vedic and Western astrology rules with intelligent planetary transit analysis to produce highly accurate and encouraging wellness predictions daily.' },
  { q: 'Can horoscopes predict the future?', a: 'Horoscopes do not predict absolute events; instead, they map out the energetic currents and timings, allowing you to make conscious, empowered decisions.' },
  { q: 'Which zodiac sign am I?', a: 'Your zodiac sign is determined by the date range of your birth. For example, if you were born on April 15th, you are an Aries.' },
  { q: 'How often are horoscopes updated?', a: 'All daily horoscopes, affirmations, and lucky insights are updated automatically every day at 12:00 AM local time.' },
  { q: 'Does HealConnect provide AI guidance?', a: 'Yes! HealConnect features an intelligent AI Wellness Companion designed to support you with emotional check-ins, mindful journaling, and personalized growth insights.' },
  { q: 'Are consultations private?', a: 'Absolutely. All chats, calls, and session histories with our verified experts or the AI companion are 100% private, encrypted, and secure.' }
];

// --- FILTERS ---
const FILTERS = [
  'All', 'Love', 'Career', 'Health', 'Finance', 'Education',
  'Relationships', 'Marriage', 'Family', 'Business', 'Travel',
  'Spiritual', 'Mental Wellness', 'Self Growth'
];

export default function HoroscopePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['All']);
  const [selectedSign, setSelectedSign] = useState<ZodiacSign | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryHoroscope | null>(null);
  const [selectedCategorySign, setSelectedCategorySign] = useState<ZodiacSign>(ZODIAC_SIGNS[0]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Sync category sign when opening category modal
  const handleOpenCategory = (cat: CategoryHoroscope) => {
    if (selectedSign) {
      setSelectedCategorySign(selectedSign);
    } else {
      setSelectedCategorySign(ZODIAC_SIGNS[0]);
    }
    setSelectedCategory(cat);
  };

  // Handle filter selection
  const handleFilterClick = (filter: string) => {
    if (filter === 'All') {
      setSelectedFilters(['All']);
      return;
    }

    let updated = [...selectedFilters].filter(f => f !== 'All');
    if (updated.includes(filter)) {
      updated = updated.filter(f => f !== filter);
      if (updated.length === 0) updated = ['All'];
    } else {
      updated.push(filter);
    }
    setSelectedFilters(updated);
  };

  const clearFilters = () => {
    setSelectedFilters(['All']);
  };

  // Filtered daily cards
  const filteredSigns = useMemo(() => {
    return ZODIAC_SIGNS.filter(sign => {
      const matchesSearch = sign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sign.planet.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sign.element.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (selectedFilters.includes('All')) return true;

      // Map filter keywords to sign predictions/insights
      return selectedFilters.every(filter => {
        const lowerFilter = filter.toLowerCase();
        if (lowerFilter === 'love' || lowerFilter === 'relationships' || lowerFilter === 'marriage') {
          return sign.prediction.love.toLowerCase().includes('partner') || sign.prediction.love.toLowerCase().includes('love') || sign.prediction.love.toLowerCase().includes('relationship');
        }
        if (lowerFilter === 'career' || lowerFilter === 'business') {
          return sign.prediction.career.toLowerCase().includes('work') || sign.prediction.career.toLowerCase().includes('job') || sign.prediction.career.toLowerCase().includes('project');
        }
        if (lowerFilter === 'finance') {
          return sign.prediction.finance.toLowerCase().includes('budget') || sign.prediction.finance.toLowerCase().includes('save') || sign.prediction.finance.toLowerCase().includes('spend');
        }
        if (lowerFilter === 'health' || lowerFilter === 'mental wellness') {
          return sign.prediction.health.toLowerCase().includes('body') || sign.prediction.health.toLowerCase().includes('rest') || sign.prediction.health.toLowerCase().includes('meditation');
        }
        if (lowerFilter === 'education') {
          return sign.prediction.education.toLowerCase().includes('study') || sign.prediction.education.toLowerCase().includes('learn');
        }
        if (lowerFilter === 'spiritual') {
          return sign.prediction.spiritual.toLowerCase().includes('chakra') || sign.prediction.spiritual.toLowerCase().includes('spirit');
        }
        return true;
      });
    });
  }, [searchQuery, selectedFilters]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: 'spring', 
        stiffness: 90, 
        damping: 14 
      } 
    }
  };

  return (
    <div className="min-h-screen bg-[#fffbf0] text-[#1a1a1a] flex flex-col font-sans">
      <Navbar />

      {/* ═══ 1. Hero Section ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 pt-28 pb-20 px-4 text-center text-white shrink-0">
        {/* Floating background decorative circles */}
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="container mx-auto max-w-4xl relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-sm font-semibold tracking-wide"
          >
            <Sparkles className="w-4 h-4 text-yellow-200 animate-pulse" />
            <span>HEALCONNECT DAILY INSIGHTS</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-8xl font-normal font-cursive tracking-wide text-white drop-shadow-md py-2"
          >
            Daily Horoscope
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-white/90 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Unlock cosmic alignment, emotional wellness, and personalized guidance guided by the daily movements of the planets.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="pt-4"
          >
            <button
              onClick={() => document.getElementById('zodiac-signs')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white hover:bg-amber-50 text-amber-600 font-extrabold text-base rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto"
            >
              View Today&apos;s Horoscope
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      <main className="flex-grow container mx-auto px-4 py-10 max-w-6xl space-y-16">
        
        {/* ═══ 2. Zodiac Signs Selection Section ═══ */}
        <section id="zodiac-signs" className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-2"
          >
            <h2 className="text-5xl md:text-7xl font-normal text-amber-600 font-cursive tracking-wide drop-shadow-sm py-2">
              Choose Your Zodiac Sign
            </h2>
            <p className="text-gray-500 font-medium max-w-lg mx-auto">Click on your zodiac sign to reveal your personalized daily insights, planet, and element.</p>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6"
          >
            {ZODIAC_SIGNS.map((sign) => (
              <motion.div
                key={sign.name}
                variants={cardVariants}
                whileHover={{ 
                  y: -8, 
                  scale: 1.05,
                  boxShadow: '0 25px 30px -5px rgba(245, 158, 11, 0.25), 0 10px 12px -6px rgba(245, 158, 11, 0.15)'
                }}
                onClick={() => setSelectedSign(sign)}
                className="bg-white border-2 border-orange-100 hover:border-orange-400 rounded-3xl p-6 text-center cursor-pointer transition-all duration-300 group flex flex-col items-center gap-4 relative overflow-hidden shadow-sm"
              >
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-200/80 flex items-center justify-center overflow-hidden group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 relative shadow-md">
                  {sign.image ? (
                    <img src={sign.image} alt={sign.name} className="w-full h-full object-cover rounded-3xl" />
                  ) : (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 font-extrabold text-5xl select-none">
                      {sign.icon + '\uFE0E'}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 group-hover:text-orange-600 transition-colors text-lg md:text-xl font-sans tracking-tight">{sign.name}</h3>
                  <p className="text-xs text-gray-400 font-semibold mt-1">{sign.dates}</p>
                </div>
                <span className="text-xs bg-orange-50 px-3 py-1 rounded-full text-orange-700 font-bold tracking-wide uppercase border border-orange-200">
                  {sign.element}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ═══ 3. Search and Filters Section ═══ */}
        <section className="p-6 rounded-3xl bg-white border border-yellow-100 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-xl font-extrabold text-gray-900">Search & Custom Filters</h3>
              <p className="text-xs text-gray-400 font-semibold">Filter horoscopes by category, wellness interests, or search your sign.</p>
            </div>
            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sign, element, planet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-full bg-yellow-50/50 border border-yellow-100 focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/40 text-[#1a1a1a] placeholder:text-gray-400 font-medium"
              />
            </div>
          </div>

          {/* Filter list */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
            {FILTERS.map(filter => {
              const active = selectedFilters.includes(filter);
              return (
                <button
                  key={filter}
                  onClick={() => handleFilterClick(filter)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    active
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : 'bg-yellow-50/50 border-yellow-100 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          {/* Active chips row */}
          {!selectedFilters.includes('All') && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-50 text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Active:</span>
              {selectedFilters.map(f => (
                <span key={f} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full font-bold">
                  {f}
                  <button onClick={() => handleFilterClick(f)}><X className="w-3 h-3 text-amber-600 hover:text-amber-800" /></button>
                </span>
              ))}
              <button onClick={clearFilters} className="ml-auto text-red-500 font-bold hover:underline">
                Clear all
              </button>
            </div>
          )}
        </section>

        {/* ═══ 4. Daily Horoscope Cards Section ═══ */}
        <section className="space-y-6">
          <div className="text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <h2 className="text-4xl md:text-6xl font-normal text-amber-600 font-cursive tracking-wide">Today&apos;s Predictions</h2>
              <p className="text-gray-500 font-medium mt-1">Explore daily energy levels, wellness trends, and guidance details.</p>
            </div>
            <div className="text-xs text-gray-400 font-bold tracking-wide flex items-center gap-1.5 justify-center md:justify-start">
              <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span>UPDATED DAILY AT 12:00 AM</span>
            </div>
          </div>

          {filteredSigns.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-yellow-100/50 text-gray-400">
              <Sparkles className="w-12 h-12 mx-auto text-amber-200 mb-3" />
              <p className="text-lg font-bold">No predictions match your search or filters.</p>
              <p className="text-sm mt-1">Try resetting filters to show all zodiac signs.</p>
              <button onClick={clearFilters} className="mt-4 px-6 py-2 bg-amber-500 text-white font-bold rounded-full text-xs">
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSigns.map((sign) => (
                <Card key={sign.name} className="bg-white border border-yellow-100 hover:border-amber-200 hover:shadow-lg transition-all rounded-3xl overflow-hidden flex flex-col h-full">
                  <CardContent className="p-6 flex flex-col h-full space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100/50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {sign.image ? (
                          <img src={sign.image} alt={sign.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <span className="text-2xl">{sign.icon}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-base font-sans">{sign.name}</h3>
                        <p className="text-xs text-gray-400 font-bold">{sign.dates}</p>
                      </div>
                      <span className="ml-auto text-xs bg-orange-50 border border-orange-100 text-orange-700 font-extrabold px-2.5 py-0.5 rounded-full shrink-0">
                        ⚡ {sign.insights.energy}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 flex-grow">
                      {sign.prediction.general}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-gray-400 font-semibold">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Lucky: <strong className="text-gray-700">{sign.insights.luckyNumber}</strong></span>
                      </div>
                      <button
                        onClick={() => setSelectedSign(sign)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-extrabold flex items-center gap-1"
                      >
                        Read More
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ═══ 5. More Daily Horoscopes Section ═══ */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-4xl md:text-6xl font-normal text-amber-600 font-cursive tracking-wide">More Daily Horoscopes</h2>
            <p className="text-gray-500 font-medium">Explore specific fields of interest or view longer term forecasts.</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORY_HOROSCOPES.map((cat) => (
              <motion.div
                key={cat.id}
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setSelectedCategory(cat)}
                className="bg-white border border-yellow-100 hover:border-amber-200 hover:shadow-md rounded-3xl p-5 cursor-pointer transition-all flex flex-col justify-between h-full space-y-3"
              >
                <div className="space-y-2">
                  <div className="text-2xl">{cat.icon}</div>
                  <h3 className="font-extrabold text-gray-900 text-sm">{cat.name}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{cat.desc}</p>
                </div>
                <span className="text-[11px] text-amber-600 font-extrabold flex items-center gap-0.5 self-start">
                  Explore Insights <ChevronRight className="w-3 h-3" />
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══ 6. Daily Insights Widget ═══ */}
        <section className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 md:p-8 text-white relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="grid md:grid-cols-3 gap-8 items-center relative z-10">
            <div className="space-y-3 md:col-span-1 text-center md:text-left">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-xs font-bold tracking-wide uppercase">
                <Sparkles className="w-3 h-3 text-yellow-200 animate-pulse" />
                <span>Today&apos;s Cosmic Climate</span>
              </div>
              <h2 className="text-3xl font-black">Daily Insights Widget</h2>
              <p className="text-white/80 text-sm leading-relaxed">Average universal statistics and energetic properties guiding the day.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:col-span-2 gap-4">
              {[
                { label: 'Lucky Number', val: '9, 6, 5', sub: 'Highly active numbers' },
                { label: 'Lucky Color', val: 'Golden, Green', sub: 'Wear for positive energy' },
                { label: 'Mood', val: 'Curious & Dynamic', sub: 'Universal average' },
                { label: 'Best Time', val: '9:00 AM - 1:30 PM', sub: 'High cosmic alignment' },
                { label: 'Compatible Sign', val: 'Aries & Leo', sub: 'Harmonious interaction' },
                { label: 'Planet focus', val: 'Mercury & Sun', sub: 'Active planets' },
                { label: 'Element power', val: 'Fire & Earth', sub: 'Grounded drive' },
                { label: 'Daily Energy', val: '92%', sub: 'High vibration level' }
              ].map((item, idx) => (
                <div key={idx} className="bg-white/10 rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
                  <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider">{item.label}</span>
                  <p className="text-base font-extrabold text-white mt-1">{item.val}</p>
                  <span className="text-[9px] text-white/60 mt-1 font-semibold">{item.sub}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 text-center text-sm md:text-base font-bold italic bg-white/5 rounded-2xl p-4">
            📌 Daily Affirmation: &ldquo;I flow with the ocean of life, guided by cosmic alignment and trust.&rdquo;
          </div>
        </section>

        {/* ═══ 7. AI Guidance Section ═══ */}
        <section className="rounded-3xl bg-white border border-yellow-100 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <Brain className="w-8 h-8 text-amber-500" />
          </div>
          <div className="flex-1 text-center md:text-left space-y-1">
            <h3 className="text-xl font-extrabold text-gray-900">Need Personalized Guidance?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">Continue your wellness journey with HealConnect AI for emotional support, journaling, and personalized insights.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link href="/" className="flex-grow md:flex-grow-0">
              <button className="w-full px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm transition-all shadow-md">
                Chat with AI
              </button>
            </Link>
            <Link href="/dashboard" className="flex-grow md:flex-grow-0">
              <button className="w-full px-6 py-3 rounded-full bg-white hover:bg-amber-50 border border-amber-200 text-amber-600 font-extrabold text-sm transition-all shadow-sm">
                Start Journaling
              </button>
            </Link>
          </div>
        </section>

        {/* ═══ 8. Educational Section ═══ */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-4xl md:text-6xl font-normal text-amber-600 font-cursive tracking-wide">How to Read Your Horoscope</h2>
            <p className="text-gray-500 font-medium max-w-lg mx-auto">Astrology is more than just your Sun sign. Understand the building blocks of your natal chart.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {EDUCATIONAL_TOPICS.map((topic, i) => (
              <div key={i} className="bg-white border border-yellow-100 rounded-3xl p-5 space-y-2 hover:border-amber-100 transition-colors">
                <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {i + 1}
                  </span>
                  {topic.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed pl-8">
                  {topic.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 9. Benefits Section ═══ */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-4xl md:text-6xl font-normal text-amber-600 font-cursive tracking-wide">Benefits of Daily Horoscope</h2>
            <p className="text-gray-500 font-medium">Aligning yourself with cosmic cycles yields practical benefits for daily life.</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {BENEFITS.map((benefit, i) => (
              <div key={i} className="bg-white border border-yellow-50 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                <Check className="w-5 h-5 text-emerald-500 mb-2" />
                <h4 className="font-extrabold text-gray-900 text-sm mb-1">{benefit.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 10. FAQ Section (Accordion) ═══ */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-4xl md:text-6xl font-normal text-amber-600 font-cursive tracking-wide">Frequently Asked Questions</h2>
            <p className="text-gray-500 font-medium">Have questions about horoscopes, privacy, or accuracy? We have answers.</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="bg-white rounded-2xl border border-yellow-100 overflow-hidden transition-all duration-300 hover:border-amber-200">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left font-extrabold text-sm text-gray-900"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-amber-500 shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 text-xs md:text-sm text-gray-500 leading-relaxed pt-1">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ 11. About HealConnect Section ═══ */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-50 via-amber-50/20 to-white border border-amber-100 p-6 md:p-10 shadow-sm">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            
            {/* Left side: Premium AI Generated Astrology Companion Image */}
            <div className="flex items-center justify-center p-4">
              <img
                src="/astrology_companion.jpg"
                alt="AI Astrology & Wellness Companion"
                className="w-full max-w-[360px] md:max-w-[420px] h-auto rounded-3xl shadow-2xl border-4 border-amber-200/80 hover:scale-105 transition-all duration-500 object-cover"
              />
            </div>

            {/* Right Side: HealConnect Info */}
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-1">About HealConnect</p>
                <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">Your Trusted AI-Powered Wellness Companion</h2>
              </div>
              
              <p className="text-sm text-gray-600 leading-relaxed">
                HealConnect is your trusted AI-powered wellness companion designed to support every stage of your life journey. We combine trusted astrologers, AI-powered emotional guidance, personalized journaling, mindfulness tools, and holistic wellness resources into one seamless platform.
              </p>
              
              {/* Highlight Checkmarks */}
              <div className="grid grid-cols-2 gap-3 text-xs font-bold text-gray-800">
                {[
                  'Verified Experts',
                  'AI Wellness Companion',
                  'Daily Horoscope',
                  'Emotional Journaling',
                  'Secure Consultations',
                  'Personalized Guidance'
                ].map(feat => (
                  <div key={feat} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Start Journey CTA Button */}
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="mt-4 flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm transition-all shadow-lg hover:shadow-amber-500/20 hover:scale-105 active:scale-95"
              >
                Start Your Healing Journey
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* ═══ Shared Footer ═══ */}
      <footer className="bg-gradient-to-b from-amber-50 to-yellow-50 text-gray-700 pt-12 pb-6 border-t border-amber-100 mt-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Top: Brand + Links */}
          <div className="flex flex-wrap gap-8 mb-10">
            {/* Brand */}
            <div className="w-full lg:w-72 text-center lg:text-left">
              <div className="flex items-center gap-2 mb-4 justify-center lg:justify-start">
                <Image src="/logo.png" alt="HealConnect" width={28} height={28} className="rounded-full" />
                <span className="text-lg font-extrabold text-amber-600">HealConnect</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                Your trusted companion for mental peace, emotional guidance, and classical astrology wellness.
              </p>
            </div>

            {/* Links Columns */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                {
                  title: 'Consult',
                  links: ['Consultations', 'Horoscope', 'AI Chat']
                },
                {
                  title: 'Free Tools',
                  links: ['Free Services', 'Calculators', 'Panchang']
                },
                {
                  title: 'Resources',
                  links: ['Astrology Blog', 'Help Center', 'Privacy Policy']
                },
                {
                  title: 'HealConnect',
                  links: ['About Us', 'Contact Support', 'Careers']
                }
              ].map((col) => (
                <div key={col.title}>
                  <h4 className="text-amber-800 font-bold text-sm mb-3">{col.title}</h4>
                  <ul className="space-y-1.5">
                    {col.links.map((link) => (
                      <li key={link}>
                        <Link href="/signup" className="text-xs text-gray-500 hover:text-amber-600 transition-colors">{link}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="border-t border-amber-200 pt-6 text-center text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} HealConnect. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ═══ 12. Modal / Dialogs for detailed views ═══ */}
      <AnimatePresence>
        {/* Zodiac Sign Detailed Modal */}
        {selectedSign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSign(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 border border-yellow-100 max-h-[85vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 shrink-0 relative">
                <button
                  onClick={() => setSelectedSign(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                    {selectedSign.image ? (
                      <img src={selectedSign.image} alt={selectedSign.name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <span className="text-4xl">{selectedSign.icon}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold font-sans">{selectedSign.name} <span className="font-cursive text-3xl font-normal text-amber-100">Today&apos;s Horoscope</span></h2>
                    <p className="text-white/80 text-sm font-bold">{selectedSign.dates}</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-grow">
                {/* General prediction */}
                <div className="space-y-2">
                  <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    General Forecast
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {selectedSign.prediction.general}
                  </p>
                </div>

                {/* Grid categories */}
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { title: 'Love & Relationships', icon: Heart, val: selectedSign.prediction.love, color: 'text-red-500', bg: 'bg-red-50' },
                    { title: 'Career & Work', icon: Briefcase, val: selectedSign.prediction.career, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { title: 'Money & Finance', icon: Coins, val: selectedSign.prediction.finance, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { title: 'Health & Vitality', icon: Activity, val: selectedSign.prediction.health, color: 'text-green-500', bg: 'bg-green-50' },
                    { title: 'Studies & Focus', icon: BookOpen, val: selectedSign.prediction.education, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { title: 'Spiritual Guide', icon: Compass, val: selectedSign.prediction.spiritual, color: 'text-amber-500', bg: 'bg-amber-50' }
                  ].map((cat, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                      <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-lg ${cat.bg} ${cat.color} flex items-center justify-center`}>
                          <cat.icon className="w-4 h-4" />
                        </span>
                        {cat.title}
                      </h4>
                      <p className="text-xs text-gray-500 leading-relaxed pl-10">
                        {cat.val}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Insights block */}
                <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 grid grid-cols-2 gap-4 text-xs font-semibold text-gray-600">
                  <div className="space-y-1">
                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Lucky Number</p>
                    <p className="text-gray-900 text-sm font-extrabold">{selectedSign.insights.luckyNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Lucky Color</p>
                    <p className="text-gray-900 text-sm font-extrabold">{selectedSign.insights.luckyColor}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Planet</p>
                    <p className="text-gray-900 text-sm font-extrabold">{selectedSign.planet}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Best Time</p>
                    <p className="text-gray-900 text-sm font-extrabold">{selectedSign.insights.bestTime}</p>
                  </div>
                </div>

                {/* Affirmation */}
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-center italic text-xs md:text-sm font-bold text-orange-700">
                  Daily Affirmation: &ldquo;{selectedSign.insights.affirmation}&rdquo;
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Category Horoscope Detailed Modal */}
        {selectedCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCategory(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 border border-yellow-100 max-h-[85vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-6 relative shrink-0">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                    {selectedCategorySign.image ? (
                      <img src={selectedCategorySign.image} alt={selectedCategorySign.name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <span className="text-3xl">{selectedCategorySign.icon}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-[11px] font-extrabold tracking-wide uppercase">
                      <RefreshCw className="w-3 h-3 text-yellow-200 animate-spin" />
                      <span>Updated Today • {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold font-sans tracking-tight">
                      {selectedCategorySign.name} <span className="text-amber-100 font-normal">• {selectedCategory.name}</span>
                    </h2>
                    <p className="text-white/90 text-xs font-bold">
                      {selectedCategorySign.dates} — Planet: {selectedCategorySign.planet} ({selectedCategorySign.element} Element)
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2 text-xs font-bold text-yellow-100">
                  <Sparkles className="w-4 h-4 text-yellow-200 animate-pulse shrink-0" />
                  <span>Transit Alignment: {selectedCategorySign.planet} Transiting {selectedCategory.name.split(' ')[0]} Sector</span>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-grow">
                {/* ══ ZODIAC SIGN SELECTOR ══ */}
                <div className="space-y-2.5 pb-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Select Zodiac Sign for Personal Forecast:
                    </label>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      {selectedCategorySign.name} ({selectedCategorySign.dates})
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {ZODIAC_SIGNS.map((sign) => {
                      const isSelected = selectedCategorySign.name === sign.name;
                      return (
                        <button
                          key={sign.name}
                          onClick={() => setSelectedCategorySign(sign)}
                          className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center gap-1 ${
                            isSelected
                              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-500 shadow-md scale-105 font-bold'
                              : 'bg-amber-50/50 hover:bg-amber-100/70 text-gray-800 border-amber-200/60 hover:border-amber-300'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white/30">
                            {sign.image ? (
                              <img src={sign.image} alt={sign.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <span className="text-xs font-bold">{sign.icon}</span>
                            )}
                          </div>
                          <span className="text-[11px] leading-tight font-extrabold truncate w-full">{sign.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Overview */}
                <div className="space-y-2">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 uppercase tracking-wider text-amber-700">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    {selectedCategorySign.name} {selectedCategory.name} Forecast
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed bg-amber-50/40 p-4 rounded-2xl border border-amber-100/70">
                    For <strong>{selectedCategorySign.name}</strong> ({selectedCategorySign.dates}), ruling planet {selectedCategorySign.planet} in element {selectedCategorySign.element} influences your {selectedCategory.name.toLowerCase()} today.{' '}
                    {selectedCategorySign.prediction[selectedCategory.id === 'weekly' || selectedCategory.id === 'monthly' ? 'general' : (selectedCategory.id as keyof ZodiacSign['prediction'])] || selectedCategorySign.prediction.general}{' '}
                    {selectedCategory.overview}
                  </p>
                </div>

                {/* Key Guidance */}
                <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-100 space-y-1.5">
                  <h4 className="font-extrabold text-xs text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-orange-500" />
                    Actionable Focus & Timing for {selectedCategorySign.name}
                  </h4>
                  <p className="text-xs md:text-sm text-orange-950 font-medium leading-relaxed">
                    Today, {selectedCategorySign.name} will experience peak clarity during peak cosmic hours (<strong>{selectedCategorySign.insights.bestTime}</strong>). Leverage your {selectedCategorySign.insights.mood.toLowerCase()} energy mindset. Compatible interaction sign: <strong>{selectedCategorySign.insights.compatibleSign}</strong>.{' '}
                    {selectedCategory.guidance}
                  </p>
                </div>

                {/* Do's and Don'ts Checklist */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Do's */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                    <h4 className="font-extrabold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Recommended Do&apos;s for {selectedCategorySign.name}
                    </h4>
                    <ul className="space-y-1.5 text-xs text-gray-700 font-medium">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>Focus key priorities during peak window: {selectedCategorySign.insights.bestTime}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>Surround yourself with lucky color: {selectedCategorySign.insights.luckyColor} (Lucky #: {selectedCategorySign.insights.luckyNumber})</span>
                      </li>
                      {selectedCategory.dos.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Don'ts */}
                  <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-2">
                    <h4 className="font-extrabold text-xs text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                      <X className="w-4 h-4 text-rose-500" />
                      Things to Avoid Today
                    </h4>
                    <ul className="space-y-1.5 text-xs text-gray-700 font-medium">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                        <span>Avoid high-stress commitments outside your peak window ({selectedCategorySign.insights.bestTime})</span>
                      </li>
                      {selectedCategory.donts.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Daily Affirmation */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-center italic text-xs md:text-sm font-extrabold text-amber-800">
                  📌 {selectedCategorySign.name} Daily Affirmation: &ldquo;{selectedCategorySign.insights.affirmation}&rdquo;
                </div>

                <button
                  onClick={() => setSelectedCategory(null)}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm rounded-full transition-all shadow-md active:scale-95"
                >
                  Close {selectedCategorySign.name} Forecast
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Dynamic card wrapper component to avoid compile issues ---
function Card({ children, className = '', ...props }: any) {
  return (
    <div className={`shadow-sm bg-white rounded-2xl ${className}`} {...props}>
      {children}
    </div>
  );
}

function CardContent({ children, className = '', ...props }: any) {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
