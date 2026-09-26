
import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, Search } from 'lucide-react';
import Pagination from '../surveys/Pagination';
import { SchoolSearchResult, SignUpFormData } from '../../types/auth';

interface SchoolSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searching: boolean;
  searchResults: SchoolSearchResult[];
  currentPage: number;
  totalResults: number;
  resultsPerPage: number;
  handleSearchSchool: (page?: number) => Promise<void>;
  handlePageChange: (page: number) => void;
  selectSchool: (school: SchoolSearchResult) => void;
  toggleCustomSchool: () => void;
  selectedSchool: {
    name: string;
    address: string;
  } | null;
  onChangeSchool: () => void;
  formData: SignUpFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

const SchoolSearch: React.FC<SchoolSearchProps> = ({
  searchQuery,
  setSearchQuery,
  searching,
  searchResults,
  currentPage,
  totalResults,
  resultsPerPage,
  handleSearchSchool,
  handlePageChange,
  selectSchool,
  toggleCustomSchool,
  selectedSchool,
  onChangeSchool,
  formData,
  onChange,
  isLoading
}) => {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        School/College
      </label>
      
      {selectedSchool ? (
        <div className="space-y-4">
          <div className="p-4 border rounded-md bg-gray-50">
            <p className="font-medium">{selectedSchool.name}</p>
            <p className="text-sm text-gray-600 mt-1">{selectedSchool.address}</p>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={onChangeSchool}
            >
              Change School
            </Button>
          </div>
          
          <div>
            <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
              Organisation Name
              <span className="text-xs text-gray-500 ml-2">
                (Customise if needed)
              </span>
            </label>
            <Input
              id="organizationName"
              name="organizationName"
              type="text"
              required
              className="form-input w-full"
              value={formData.organizationName}
              onChange={onChange}
              disabled={isLoading}
              placeholder="How would you like to name your organisation?"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be the name of your organisation in the system. You can customise it (e.g., "HR Team" or "Wellbeing Committee").
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search by school name or postcode"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSchool();
                }
              }}
            />
            <Button 
              type="button" 
              onClick={() => handleSearchSchool()} 
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? (
                <Loader2 size={18} className="animate-spin mr-2" />
              ) : (
                <Search size={18} className="mr-2" />
              )}
              Search
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="border rounded-md overflow-hidden divide-y">
                {searchResults.map((school, index) => (
                  <div 
                    key={`${school.URN}-${index}`} 
                    className="p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => selectSchool(school)}
                  >
                    <p className="font-medium">{school.EstablishmentName}</p>
                    <p className="text-sm text-gray-600">{school.Postcode}</p>
                  </div>
                ))}
              </div>
              
              {totalResults > resultsPerPage && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(totalResults / resultsPerPage)}
                    onPageChange={handlePageChange}
                  />
                  <p className="text-xs text-center text-gray-500 mt-2">
                    Showing {searchResults.length} of {totalResults} results
                  </p>
                </div>
              )}
            </div>
          )}
          
          {searchQuery && searchResults.length === 0 && !searching && (
            <p className="text-sm text-gray-600">No schools found matching your search.</p>
          )}
        </div>
      )}
      
      <div>
        <Button 
          type="button" 
          variant="outline" 
          onClick={toggleCustomSchool}
          className="w-full"
        >
          My School/College is not listed
        </Button>
      </div>
    </div>
  );
};

export default SchoolSearch;
