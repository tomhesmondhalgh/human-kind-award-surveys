
import React from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import SchoolSearch from '../onboarding/SchoolSearch';
import CustomSchoolForm from '../onboarding/CustomSchoolForm';
import { SignUpFormData, SchoolSearchResult } from '../../types/auth';

interface ProfessionalDetailsFormProps {
  formData: SignUpFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  useCustomSchool: boolean;
  setUseCustomSchool: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SchoolSearchResult[];
  searching: boolean;
  currentPage: number;
  totalResults: number;
  resultsPerPage: number;
  handleSearchSchool: (page?: number) => Promise<void>;
  handlePageChange: (page: number) => void;
  selectSchool: (school: SchoolSearchResult) => void;
  resetSelectedSchool: () => void;
}

const ProfessionalDetailsForm: React.FC<ProfessionalDetailsFormProps> = ({
  formData,
  onChange,
  isLoading,
  useCustomSchool,
  setUseCustomSchool,
  searchQuery,
  setSearchQuery,
  searchResults,
  searching,
  currentPage,
  totalResults,
  resultsPerPage,
  handleSearchSchool,
  handlePageChange,
  selectSchool,
  resetSelectedSchool
}) => {
  const toggleCustomSchool = () => {
    setUseCustomSchool(!useCustomSchool);
    if (!useCustomSchool) {
      resetSelectedSchool();
    }
  };

  const selectedSchool = formData.schoolName && formData.schoolAddress 
    ? { name: formData.schoolName, address: formData.schoolAddress } 
    : null;

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Professional details</h3>
      
      <div>
        <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
          Job title
        </label>
        <Input
          id="jobTitle"
          name="jobTitle"
          type="text"
          required
          className="form-input w-full"
          value={formData.jobTitle}
          onChange={onChange}
          disabled={isLoading}
        />
      </div>
      
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">School/College details</h4>
        
        {!useCustomSchool ? (
          <SchoolSearch 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searching={searching}
            searchResults={searchResults}
            currentPage={currentPage}
            totalResults={totalResults}
            resultsPerPage={resultsPerPage}
            handleSearchSchool={handleSearchSchool}
            handlePageChange={handlePageChange}
            selectSchool={selectSchool}
            toggleCustomSchool={toggleCustomSchool}
            selectedSchool={selectedSchool}
            onChangeSchool={resetSelectedSchool}
            formData={formData}
            onChange={onChange}
            isLoading={isLoading}
          />
        ) : (
          <CustomSchoolForm 
            formData={formData}
            onChange={onChange}
            onToggleCustomSchool={toggleCustomSchool}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default ProfessionalDetailsForm;
