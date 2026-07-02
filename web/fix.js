const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

content = content.replace(/text-slate-400/g, 'text-muted-foreground');
content = content.replace(/text-slate-500/g, 'text-muted-foreground');
content = content.replace(/text-slate-200/g, 'text-foreground');
content = content.replace(/text-slate-300/g, 'text-foreground');
content = content.replace(/border-slate-800/g, 'border-border');
content = content.replace(/border-slate-700/g, 'border-border');
content = content.replace(/bg-slate-900\/50/g, 'bg-muted/50');
content = content.replace(/bg-slate-900/g, 'bg-card');
content = content.replace(/hover:bg-slate-800/g, 'hover:bg-accent');
content = content.replace(/hover:text-slate-100/g, 'hover:text-accent-foreground');
content = content.replace(/bg-slate-800/g, 'bg-secondary');
content = content.replace(/via-slate-950 to-slate-950/g, 'via-background to-background');
content = content.replace(/from-indigo-900\/20/g, 'dark:from-indigo-900/20 from-indigo-100/50');
content = content.replace(/text-slate-50/g, 'text-foreground');

// Same for login page
let loginContent = fs.readFileSync('src/app/login/page.tsx', 'utf8');
loginContent = loginContent.replace(/text-slate-400/g, 'text-muted-foreground');
loginContent = loginContent.replace(/text-slate-500/g, 'text-muted-foreground');
loginContent = loginContent.replace(/text-slate-200/g, 'text-foreground');
loginContent = loginContent.replace(/text-slate-300/g, 'text-foreground');
loginContent = loginContent.replace(/border-slate-800/g, 'border-border');
loginContent = loginContent.replace(/border-slate-700/g, 'border-border');
loginContent = loginContent.replace(/bg-slate-900\/50/g, 'bg-muted/50');
loginContent = loginContent.replace(/bg-slate-900/g, 'bg-card');
loginContent = loginContent.replace(/hover:bg-slate-800/g, 'hover:bg-accent');
loginContent = loginContent.replace(/hover:text-slate-100/g, 'hover:text-accent-foreground');
loginContent = loginContent.replace(/bg-slate-950/g, 'bg-background');
loginContent = loginContent.replace(/text-white/g, 'dark:text-white text-slate-900');
fs.writeFileSync('src/app/login/page.tsx', loginContent);

// Same for signup page
let signupContent = fs.readFileSync('src/app/signup/page.tsx', 'utf8');
signupContent = signupContent.replace(/text-slate-400/g, 'text-muted-foreground');
signupContent = signupContent.replace(/text-slate-500/g, 'text-muted-foreground');
signupContent = signupContent.replace(/text-slate-200/g, 'text-foreground');
signupContent = signupContent.replace(/text-slate-300/g, 'text-foreground');
signupContent = signupContent.replace(/border-slate-800/g, 'border-border');
signupContent = signupContent.replace(/border-slate-700/g, 'border-border');
signupContent = signupContent.replace(/bg-slate-900\/50/g, 'bg-muted/50');
signupContent = signupContent.replace(/bg-slate-900/g, 'bg-card');
signupContent = signupContent.replace(/hover:bg-slate-800/g, 'hover:bg-accent');
signupContent = signupContent.replace(/hover:text-slate-100/g, 'hover:text-accent-foreground');
signupContent = signupContent.replace(/bg-slate-950/g, 'bg-background');
signupContent = signupContent.replace(/text-white/g, 'dark:text-white text-slate-900');
fs.writeFileSync('src/app/signup/page.tsx', signupContent);


fs.writeFileSync('src/app/page.tsx', content);
