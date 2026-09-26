
export interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  jobTitle: string;
  schoolName: string;
  schoolURN: string;
  organizationName: string;
  customStreetAddress: string;
  customStreetAddress2: string;
  customCity: string;
  customCounty: string;
  customPostalCode: string;
  customCountry: string;
  schoolAddress: string;
}

export interface SchoolSearchResult {
  URN: string;
  EstablishmentName: string;
  Postcode: string;
  Street: string;
  Town: string;
  County: string;
}

// Details collected at sign-up and on the profile page. All optional: each
// caller sends the fields it has.
export interface UserProfileData {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  schoolName?: string;
  schoolAddress?: string;
  schoolURN?: string;
  organizationName?: string;
  email?: string;
}

export type AuthError = Error & { isEmailConfirmationError?: boolean };

export interface AuthResult {
  error: AuthError | null;
  success: boolean;
}
