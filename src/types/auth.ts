
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
