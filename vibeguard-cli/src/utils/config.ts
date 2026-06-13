import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { VibeGuardConfig, Severity } from '../types/index.js';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

const severitySchema = z.enum(['low', 'medium', 'high', 'critical']);

const configSchema = z.object({
  minSeverity: severitySchema.default('low'),
  scoreThreshold: z.number().min(0).max(100).default(50),
  ignore: z.array(z.string()).default([
    '**/node_modules/**', '**/.git/**', '**/dist/**',
    '**/build/**', '**/.next/**', '**/*.min.js',
    '**/tests/**', '**/test/**', '**/*.test.*', '**/*.spec.*'
  ]),
  extensions: z.array(z.string()).default([
    '.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.yaml', '.yml', '.env'
  ]),
  maxFileSize: z.number().default(1048576), // 1MB
  detectors: z.record(z.string(), z.boolean()).default({
    secrets: true, sql: true, auth: true, files: true, cmdInjection: true, ssrf: true
  }),
  rules: z.record(z.string(), z.union([z.boolean(), severitySchema])).default({}),
  outputFormat: z.enum(['text', 'json', 'sarif']).default('text'),
  showBadge: z.boolean().default(true),
});

export function parseEnvConfig(): Partial<VibeGuardConfig> {
  const envConfig: Partial<VibeGuardConfig> = {};
  if (process.env.VIBEGUARD_MIN_SEVERITY) {
    envConfig.minSeverity = process.env.VIBEGUARD_MIN_SEVERITY as Severity;
  }
  if (process.env.VIBEGUARD_SCORE_THRESHOLD) {
    envConfig.scoreThreshold = parseInt(process.env.VIBEGUARD_SCORE_THRESHOLD, 10);
  }
  if (process.env.VIBEGUARD_OUTPUT_FORMAT) {
    envConfig.outputFormat = process.env.VIBEGUARD_OUTPUT_FORMAT as any;
  }
  if (process.env.VIBEGUARD_MAX_FILE_SIZE) {
    envConfig.maxFileSize = parseInt(process.env.VIBEGUARD_MAX_FILE_SIZE, 10);
  }
  return envConfig;
}

export async function loadConfig(cliOverrides?: Partial<VibeGuardConfig>, configPath?: string): Promise<VibeGuardConfig> {
  let fileConfig: any = {};
  
  try {
    const defaultPath = path.resolve(process.cwd(), '.vibeguard.yaml');
    const targetPath = configPath ? path.resolve(process.cwd(), configPath) : defaultPath;
    
    try {
      const content = await fs.readFile(targetPath, 'utf-8');
      fileConfig = yaml.parse(content) || {};
    } catch (err: any) {
      if (configPath || err.code !== 'ENOENT') {
        throw new ConfigError(`Failed to load config from ${targetPath}: ${err.message}`);
      }
    }
    
    const envConfig = parseEnvConfig();
    
    const merged = {
      ...fileConfig,
      ...envConfig,
      ...(cliOverrides || {})
    };
    
    // Remove undefined values to let defaults kick in properly
    Object.keys(merged).forEach(key => merged[key] === undefined && delete merged[key]);
    
    const result = configSchema.safeParse(merged);
    if (!result.success) {
      throw new ConfigError(`Configuration validation failed: ${result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    
    return result.data as VibeGuardConfig;
  } catch (error: any) {
    if (error instanceof ConfigError) throw error;
    throw new ConfigError(error.message);
  }
}

export async function initConfig(rootPath: string): Promise<void> {
  const defaultPath = path.resolve(rootPath, '.vibeguard.yaml');
  try {
    await fs.access(defaultPath);
    throw new ConfigError(`.vibeguard.yaml already exists at ${rootPath}`);
  } catch (error: any) {
    if (error.code !== 'ENOENT' && !(error instanceof ConfigError)) {
      throw error;
    }
    if (error instanceof ConfigError) {
      throw error;
    }
  }

  const exampleContent = `minSeverity: low
scoreThreshold: 50
ignore:
  - "**/node_modules/**"
  - "**/.git/**"
  - "**/dist/**"
  - "**/build/**"
  - "**/*.min.js"
  - "**/coverage/**"
  - "**/tests/**"
  - "**/test/**"
  - "**/*.test.*"
  - "**/*.spec.*"
extensions:
  - ".js"
  - ".ts"
  - ".jsx"
  - ".tsx"
  - ".py"
  - ".json"
  - ".yaml"
  - ".yml"
  - ".env"
maxFileSize: 1048576
detectors:
  secrets: true
  sql: true
  auth: true
  files: true
  cmdInjection: true
  ssrf: true
rules: {}
outputFormat: text
showBadge: true`;

  await fs.writeFile(defaultPath, exampleContent, 'utf-8');
}
