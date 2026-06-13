import { Issue } from '../../types/index.js';
import { Detector } from './secrets.js';
import { analyzeFileForTaint } from '../ast/taintAnalyzer.js';

export class AstTaintDetector implements Detector {
  readonly id = 'astTaint';
  readonly name = 'AST Taint Flow Analyzer';
  readonly supportedExtensions = ['.js', '.ts', '.jsx', '.tsx'];

  detect(filePath: string, content: string): Issue[] {
    try {
      return analyzeFileForTaint(filePath, content);
    } catch (e) {
      // Gracefully fall back if AST parsing fails on a broken file
      return [];
    }
  }
}
