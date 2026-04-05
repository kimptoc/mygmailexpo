import { useThemeColor } from '@/hooks/use-theme-color';

export const parseRgbColor = (value: string) => {
  const parts = value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;
  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);
  const a = parts.length >= 4 ? Number(parts[3]) : 1;
  if ([r, g, b, a].some(part => Number.isNaN(part))) return null;
  return { r, g, b, a };
};

export const parseHexColor = (value: string) => {
  const hex = value.replace('#', '');
  if (![3, 4, 6, 8].includes(hex.length)) return null;
  const toByte = (str: string) => parseInt(str, 16);
  const expand = (str: string) => str.split('').map(ch => ch + ch).join('');
  const normalized = hex.length <= 4 ? expand(hex) : hex;
  const r = toByte(normalized.slice(0, 2));
  const g = toByte(normalized.slice(2, 4));
  const b = toByte(normalized.slice(4, 6));
  const a = normalized.length >= 8 ? toByte(normalized.slice(6, 8)) / 255 : 1;
  if ([r, g, b, a].some(part => Number.isNaN(part))) return null;
  return { r, g, b, a };
};

export const isWhiteColor = (color: string) => {
  const normalized = color.trim().toLowerCase();
  if (normalized === 'white') return true;
  if (normalized.startsWith('#')) {
    const parsed = parseHexColor(normalized);
    return !!parsed && parsed.r === 255 && parsed.g === 255 && parsed.b === 255 && parsed.a !== 0;
  }
  if (normalized.startsWith('rgb(') || normalized.startsWith('rgba(')) {
    const inner = normalized.replace(/rgba?\(|\)/g, '');
    const parsed = parseRgbColor(inner);
    return !!parsed && parsed.r === 255 && parsed.g === 255 && parsed.b === 255 && parsed.a !== 0;
  }
  return false;
};

export const useIsTintWhite = () => {
  const tintColor = useThemeColor({}, 'tint');
  return isWhiteColor(tintColor);
};

export const useActionButtonColors = () => {
  const tintColor = useThemeColor({}, 'tint');
  const separatorColor = useThemeColor({}, 'separator');
  const textColor = useThemeColor({}, 'text');
  const isTintWhite = isWhiteColor(tintColor);

  return {
    tintColor,
    isTintWhite,
    actionButtonBackground: isTintWhite ? separatorColor : tintColor,
    actionButtonText: isTintWhite ? textColor : '#fff',
  };
};
