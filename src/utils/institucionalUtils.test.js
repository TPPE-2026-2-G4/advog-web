import { describe, expect, it } from 'vitest';
import { formatParagraphs } from './institucionalUtils';

describe('formatParagraphs', () => {
  it('should split text into paragraphs and remove empty ones', () => {
    const text = 'Para 1\n\nPara 2\n \nPara 3';
    expect(formatParagraphs(text)).toEqual(['Para 1', 'Para 2', 'Para 3']);
  });

  it('should return empty array for null or undefined', () => {
    expect(formatParagraphs(null)).toEqual([]);
    expect(formatParagraphs(undefined)).toEqual([]);
  });
});
