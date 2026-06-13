import { SecretDetector } from './src/core/detectors/secrets.js';
import { readFileSync } from 'fs';

const content = readFileSync('/Users/mohitbaghel/Downloads/1st Sem/FIFA copy/ultrafan/.env.local', 'utf-8');

const detector = new SecretDetector();
const issues = detector.detect('.env.local', content);
console.log('Issues found:', issues.length);
issues.forEach(i => console.log(i.title, i.match, i.line));
