
import React from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { SignUpFormData } from '../../types/auth';

interface CustomSchoolFormProps {
  formData: SignUpFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleCustomSchool: () => void;
  isLoading: boolean;
}

const CustomSchoolForm: React.FC<CustomSchoolFormProps> = ({
  formData,
  onChange,
  onToggleCustomSchool,
  isLoading
}) => {
  return (
    <>
      <div>
        <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-1">
          School/College name
        </label>
        <Input
          id="schoolName"
          name="schoolName"
          type="text"
          required
          className="form-input w-full"
          value={formData.schoolName}
          onChange={onChange}
          disabled={isLoading}
        />
      </div>
      
      <div>
        <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
          Organisation Name
        </label>
        <Input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          className="form-input w-full"
          value={formData.organizationName || formData.schoolName || ''}
          onChange={onChange}
          disabled={isLoading}
          placeholder="e.g., Wellbeing Team, HR Department"
        />
      </div>
      
      <div>
        <label htmlFor="customStreetAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Street address
        </label>
        <Input
          id="customStreetAddress"
          name="customStreetAddress"
          type="text"
          required
          className="form-input w-full"
          value={formData.customStreetAddress}
          onChange={onChange}
          disabled={isLoading}
        />
      </div>
      
      <div>
        <label htmlFor="customStreetAddress2" className="block text-sm font-medium text-gray-700 mb-1">
          Street address 2 (optional)
        </label>
        <Input
          id="customStreetAddress2"
          name="customStreetAddress2"
          type="text"
          className="form-input w-full"
          value={formData.customStreetAddress2}
          onChange={onChange}
          disabled={isLoading}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="customCity" className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <Input
            id="customCity"
            name="customCity"
            type="text"
            required
            className="form-input w-full"
            value={formData.customCity}
            onChange={onChange}
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label htmlFor="customCounty" className="block text-sm font-medium text-gray-700 mb-1">
            County (optional)
          </label>
          <Input
            id="customCounty"
            name="customCounty"
            type="text"
            className="form-input w-full"
            value={formData.customCounty}
            onChange={onChange}
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="customPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
            Postal code
          </label>
          <Input
            id="customPostalCode"
            name="customPostalCode"
            type="text"
            required
            className="form-input w-full"
            value={formData.customPostalCode}
            onChange={onChange}
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label htmlFor="customCountry" className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <Input
            id="customCountry"
            name="customCountry"
            type="text"
            required
            className="form-input w-full"
            value={formData.customCountry}
            onChange={onChange}
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onToggleCustomSchool}
          className="w-full"
        >
          Back to school search
        </Button>
      </div>
    </>
  );
};

export default CustomSchoolForm;
