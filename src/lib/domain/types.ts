export type ISODate = string; // "YYYY-MM-DD"

export type PermitType = 'initial_2yr' | 'subsequent_3yr' | 'permanent_5yr';

export type Card = {
  id: string;
  label: string;
  type: PermitType;
  issuedDate: ISODate;
  expiryDate: ISODate;
  notes?: string;
  archived?: boolean;
};

export type TripStatus = 'past' | 'planned';

export type TripPurpose = 'business' | 'work' | 'cultural' | 'social' | 'personal' | 'medical';

export type Trip = {
  id: string;
  departureDate: ISODate;
  returnDate: ISODate;
  destinationCountry: string; // ISO 3166-1 alpha-2
  destinationCity?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  status: TripStatus;
  needsReview?: boolean;
  purpose?: TripPurpose;
  notes?: string;
};

export type DaycountConvention = 'standard' | 'inclusive_both' | 'exclusive_both';

export type ScopeView = 'portugal' | 'schengen' | 'both';

export type Settings = {
  daycountConvention: DaycountConvention;
  defaultScopeView: ScopeView;
  lastBackupAt?: string; // ISO datetime
  acceptedDisclaimerAt?: string; // ISO datetime
};

export type CountryRecord = {
  code: string; // ISO 3166-1 alpha-2 (uppercase)
  name: string;
  flag: string; // emoji
  isSchengen: boolean;
};
