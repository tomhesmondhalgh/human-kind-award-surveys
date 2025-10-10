
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import PersonalDetailsForm from './PersonalDetailsForm';
import ProfessionalDetailsForm from './ProfessionalDetailsForm';
import { useSchoolSearch } from '../../hooks/useSchoolSearch';
import { SignUpFormData } from '../../types/auth';

interface SignUpFormProps {
  onSubmit: (data: SignUpFormData) => void;
  isLoading?: boolean;
  invitationData?: any; // Add support for invitation data
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSubmit, isLoading = false, invitationData }) => {
  console.log('Rendering SignUpForm with invitation data:', invitationData);
  
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    jobTitle: '',
    schoolName: '',
    schoolAddress: '',
    schoolURN: '',
    organizationName: '',
    customStreetAddress: '',
    customStreetAddress2: '',
    customCity: '',
    customCounty: '',
    customPostalCode: '',
    customCountry: 'United Kingdom',
  });
  
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    useCustomSchool,
    setUseCustomSchool,
    currentPage,
    totalResults,
    resultsPerPage,
    handleSearchSchool,
    handlePageChange,
    selectSchool,
    resetSelectedSchool,
    compileCustomAddress
  } = useSchoolSearch(formData, setFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('SignUpForm form submitted');
    
    if (useCustomSchool) {
      const schoolAddress = compileCustomAddress();
      const updatedFormData = {
        ...formData,
        schoolAddress
      };
      onSubmit(updatedFormData);
    } else {
      onSubmit(formData);
    }
  };

  return (
    <div className="max-w-2xl w-full mx-auto glass-card rounded-2xl p-8 animate-slide-up">
      <h2 className="text-2xl font-bold text-center mb-6">
        Create your account
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <PersonalDetailsForm
          firstName={formData.firstName}
          lastName={formData.lastName}
          email={formData.email}
          password={formData.password}
          onChange={handleChange}
          isLoading={isLoading}
        />
        
        <div className="border-t border-gray-200 pt-4 mt-4">
          <ProfessionalDetailsForm
            formData={formData}
            onChange={handleChange}
            isLoading={isLoading}
            useCustomSchool={useCustomSchool}
            setUseCustomSchool={setUseCustomSchool}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            searching={searching}
            currentPage={currentPage}
            totalResults={totalResults}
            resultsPerPage={resultsPerPage}
            handleSearchSchool={handleSearchSchool}
            handlePageChange={handlePageChange}
            selectSchool={selectSchool}
            resetSelectedSchool={resetSelectedSchool}
          />
        </div>
        
        <div>
          <button 
            type="submit" 
            className="btn-primary w-full mt-4 flex justify-center items-center" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              <>Create Account</>
            )}
          </button>
        </div>
      </form>
      
      <div className="mt-6 text-center text-sm">
        <p>
          Already have an account?{' '}
          <Link to="/login" className="text-brandPurple-600 hover:text-brandPurple-700 font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpForm;
