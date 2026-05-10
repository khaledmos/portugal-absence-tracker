import type { CountryRecord } from './types';

export const COUNTRIES: CountryRecord[] = [
  // Schengen (29 as of 2025: incl. Bulgaria, Romania, Croatia)
  { code: 'AT', name: 'Austria', flag: '🇦🇹', isSchengen: true },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', isSchengen: true },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', isSchengen: true },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', isSchengen: true },
  { code: 'CZ', name: 'Czechia', flag: '🇨🇿', isSchengen: true },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', isSchengen: true },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', isSchengen: true },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', isSchengen: true },
  { code: 'FR', name: 'France', flag: '🇫🇷', isSchengen: true },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', isSchengen: true },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', isSchengen: true },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', isSchengen: true },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', isSchengen: true },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', isSchengen: true },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', isSchengen: true },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', isSchengen: true },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', isSchengen: true },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', isSchengen: true },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', isSchengen: true },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', isSchengen: true },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', isSchengen: true },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', isSchengen: true },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', isSchengen: true },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', isSchengen: true },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', isSchengen: true },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', isSchengen: true },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', isSchengen: true },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', isSchengen: true },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', isSchengen: true },
  // Non-Schengen — common travel destinations from Portugal
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', isSchengen: false },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', isSchengen: false },
  { code: 'US', name: 'United States', flag: '🇺🇸', isSchengen: false },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', isSchengen: false },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', isSchengen: false },
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷', isSchengen: false },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', isSchengen: false },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', isSchengen: false },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', isSchengen: false },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', isSchengen: false },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', isSchengen: false },
  { code: 'CN', name: 'China', flag: '🇨🇳', isSchengen: false },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', isSchengen: false },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', isSchengen: false },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', isSchengen: false },
  { code: 'IN', name: 'India', flag: '🇮🇳', isSchengen: false },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', isSchengen: false },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', isSchengen: false },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', isSchengen: false },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', isSchengen: false },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', isSchengen: false }
];

export const COUNTRY_BY_CODE: Record<string, CountryRecord> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c])
);

export function isSchengen(code: string): boolean {
  return COUNTRY_BY_CODE[code]?.isSchengen ?? false;
}

export function countryName(code: string): string {
  return COUNTRY_BY_CODE[code]?.name ?? code;
}

export function countryFlag(code: string): string {
  return COUNTRY_BY_CODE[code]?.flag ?? '🏳️';
}
