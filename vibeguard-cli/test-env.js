const { SecretDetector, PATTERNS } = require('./dist/core/detectors/secrets.js');

const content = `
NEXT_PUBLIC_SUPABASE_URL=https://bykiszuzfbhtjgkqswzc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M
FOOTBALL_API_KEY=baa7080518mshf242378ff9d1969p1c513bjsn7992ad090776
`;

const detector = new SecretDetector();
const issues = detector.detect('.env.local', content);
console.log('Issues found:', issues.length);
issues.forEach(i => console.log(i.title, i.match));
