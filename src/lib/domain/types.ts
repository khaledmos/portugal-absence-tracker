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

export type TripPurpose =
  | 'business'
  | 'work'
  | 'personal'
  | 'tourism'
  | 'family'
  | 'medical'
  | 'other';

export type Trip = {
  id: string;
  status: TripStatus;
  needsReview?: boolean;

  // Portugal absence interval (required)
  portugalExitDate: ISODate;
  portugalReturnDate: ISODate;

  // Schengen absence sub-interval (optional)
  schengenExitDate?: ISODate;
  schengenReturnDate?: ISODate;

  // Destination
  primaryDestinationCountry: string; // ISO 3166-1 alpha-2
  otherCountriesVisited?: string[];

  // Optional border-crossing locations (free text)
  schengenExitLocation?: string;
  schengenReturnLocation?: string;

  // Multi-select purposes
  purposes?: TripPurpose[];

  notes?: string;
};

export type DaycountConvention = 'standard' | 'inclusive_both' | 'exclusive_both';

export type ScopeView = 'portugal' | 'schengen' | 'both';

export type Settings = {
  daycountConvention: DaycountConvention;
  defaultScopeView: ScopeView;
  lastBackupAt?: string;
  acceptedDisclaimerAt?: string;
};

export type CountryRecord = {
  code: string;
  name: string;
  flag: string;
  isSchengen: boolean;
};
