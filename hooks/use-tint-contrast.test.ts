import { isWhiteColor, parseHexColor, parseRgbColor } from './use-tint-contrast';

describe('use-tint-contrast helpers', () => {
  describe('parseHexColor', () => {
    it('parses 3-digit hex', () => {
      expect(parseHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    });

    it('parses 6-digit hex', () => {
      expect(parseHexColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    });

    it('parses 8-digit hex with alpha', () => {
      expect(parseHexColor('#ffffffff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
      expect(parseHexColor('#ffffff00')).toEqual({ r: 255, g: 255, b: 255, a: 0 });
    });
  });

  describe('parseRgbColor', () => {
    it('parses rgb', () => {
      expect(parseRgbColor('255, 255, 255')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    });

    it('parses rgba', () => {
      expect(parseRgbColor('255,255,255,0.5')).toEqual({ r: 255, g: 255, b: 255, a: 0.5 });
    });
  });

  describe('isWhiteColor', () => {
    it('detects common white formats', () => {
      expect(isWhiteColor('#fff')).toBe(true);
      expect(isWhiteColor('#FFFFFF')).toBe(true);
      expect(isWhiteColor('white')).toBe(true);
      expect(isWhiteColor('rgb(255, 255, 255)')).toBe(true);
      expect(isWhiteColor('rgba(255,255,255,1)')).toBe(true);
    });

    it('rejects transparent or off-white values', () => {
      expect(isWhiteColor('rgba(255,255,255,0)')).toBe(false);
      expect(isWhiteColor('#fffffe')).toBe(false);
      expect(isWhiteColor('rgb(254, 255, 255)')).toBe(false);
    });
  });
});
