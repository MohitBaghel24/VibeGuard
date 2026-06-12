import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig, initConfig, ConfigError } from '../../src/utils/config.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('config utils', () => {
  const tempDir = path.join(__dirname, 'temp_config_dir');

  beforeEach(async () => {
    vi.stubEnv('VIBEGUARD_MIN_SEVERITY', '');
    vi.stubEnv('VIBEGUARD_SCORE_THRESHOLD', '');
    await fs.mkdir(tempDir, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('loadConfig should load defaults', async () => {
    const config = await loadConfig();
    expect(config.minSeverity).toBe('low');
    expect(config.scoreThreshold).toBe(50);
  });

  it('loadConfig should respect environment variables', async () => {
    vi.stubEnv('VIBEGUARD_MIN_SEVERITY', 'high');
    vi.stubEnv('VIBEGUARD_SCORE_THRESHOLD', '80');
    
    const config = await loadConfig();
    expect(config.minSeverity).toBe('high');
    expect(config.scoreThreshold).toBe(80);
  });

  it('loadConfig should respect CLI overrides', async () => {
    const config = await loadConfig({ minSeverity: 'critical', scoreThreshold: 90 });
    expect(config.minSeverity).toBe('critical');
    expect(config.scoreThreshold).toBe(90);
  });

  it('should validate and throw ConfigError for bad values', async () => {
    await expect(loadConfig({ scoreThreshold: 150 })).rejects.toThrowError(ConfigError);
  });
  
  it('initConfig should create .vibeguard.yaml', async () => {
    await initConfig(tempDir);
    const content = await fs.readFile(path.join(tempDir, '.vibeguard.yaml'), 'utf-8');
    expect(content).toContain('minSeverity: low');
  });
});
