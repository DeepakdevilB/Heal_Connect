import { prisma } from './src/lib/prisma';

async function main() {
  console.log('Seeding dummy practitioners...');
  
  await prisma.practitioner.create({
    data: {
      name: 'Dr. Sarah Jenkins',
      email: 'sarah@healconnect.com',
      bio: 'A compassionate healer with 10 years of experience in cognitive behavioral therapy and mindfulness.',
      specialties: ['Anxiety', 'Depression', 'Mindfulness'],
      certifications: ['Licensed Clinical Social Worker (LCSW)', 'CBT Certified'],
      languages: ['English', 'Spanish'],
      experienceYrs: 10,
      perMinuteRate: 50,
      isVerified: true,
      isOnline: true,
      photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
    }
  });

  await prisma.practitioner.create({
    data: {
      name: 'Yogi Ananda',
      email: 'ananda@healconnect.com',
      bio: 'Spiritual guide and meditation expert focused on holistic well-being and inner peace.',
      specialties: ['Meditation', 'Spiritual Guidance', 'Stress Relief'],
      certifications: ['Certified Yoga Instructor', 'Vipassana Master'],
      languages: ['English', 'Hindi', 'Sanskrit'],
      experienceYrs: 15,
      perMinuteRate: 35,
      isVerified: true,
      isOnline: false,
      photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ananda'
    }
  });

  await prisma.practitioner.create({
    data: {
      name: 'Dr. Michael Chen',
      email: 'michael@healconnect.com',
      bio: 'Clinical psychologist specializing in relationship counseling and career-related stress.',
      specialties: ['Relationships', 'Career Stress', 'Life Transitions'],
      certifications: ['Psy.D in Clinical Psychology'],
      languages: ['English', 'Mandarin'],
      experienceYrs: 8,
      perMinuteRate: 60,
      isVerified: true,
      isOnline: true,
      photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael'
    }
  });

  console.log('Successfully seeded 3 verified practitioners!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
