import { SchoolSearchResult } from '@/types/auth';

type SchoolRow = {
  URN: number | string;
  EstablishmentName: string | null;
  Postcode: string | null;
  Street: string | null;
  Town: string | null;
  'County (name)': string | null;
};

// The schools table has a numeric URN and a "County (name)" column.
export const fixSchoolSearchResults = (schools: SchoolRow[]): SchoolSearchResult[] =>
  schools.map(school => ({
    URN: String(school.URN),
    EstablishmentName: school.EstablishmentName ?? '',
    Postcode: school.Postcode ?? '',
    Street: school.Street ?? '',
    Town: school.Town ?? '',
    County: school['County (name)'] ?? '',
  }));
