import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/services/toastService';
import { SchoolSearchResult, SignUpFormData } from '../types/auth';
import { fixSchoolSearchResults } from '../utils/typeConversions';

export const useSchoolSearch = (
  formData: SignUpFormData,
  setFormData: React.Dispatch<React.SetStateAction<SignUpFormData>>
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SchoolSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [useCustomSchool, setUseCustomSchool] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const resultsPerPage = 5;

  const handleSearchSchool = async (page = 1) => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setSearchResults([]);
    setCurrentPage(page);
    
    try {
      console.log('Searching for schools with query:', searchQuery);
      
      const countQuery = await supabase
        .from('schools')
        .select('URN', { count: 'exact', head: true })
        .or(`EstablishmentName.ilike.%${searchQuery.trim()}%,Postcode.ilike.%${searchQuery.trim()}%`);
      
      const totalCount = countQuery.count || 0;
      setTotalResults(totalCount);
      
      const from = (page - 1) * resultsPerPage;
      const to = from + resultsPerPage - 1;
      
      const { data, error } = await supabase
        .from('schools')
        .select('URN, EstablishmentName, Postcode, Street, Town, "County (name)"')
        .or(`EstablishmentName.ilike.%${searchQuery.trim()}%,Postcode.ilike.%${searchQuery.trim()}%`)
        .range(from, to);
      
      console.log('Search results:', data);
      console.log('Total results:', totalCount);
      
      if (error) {
        console.error('Error searching schools:', error);
        toast.error('Error searching for schools');
      } else if (data && data.length > 0) {
        // Convert URN from number to string and add County property
        const formattedResults = fixSchoolSearchResults(data);
        setSearchResults(formattedResults as SchoolSearchResult[]);
      } else {
        toast.info('No schools found matching your search term');
        console.log('No schools found matching:', searchQuery);
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search for schools');
    } finally {
      setSearching(false);
    }
  };
  
  const handlePageChange = (page: number) => {
    handleSearchSchool(page);
  };
  
  const selectSchool = (school: SchoolSearchResult) => {
    const address = [
      school.Street,
      school.Town,
      school.County,
      school.Postcode
    ].filter(Boolean).join(', ');
    
    setFormData({
      ...formData,
      schoolName: school.EstablishmentName,
      schoolAddress: address,
    });
    
    setSearchResults([]);
    setSearchQuery('');
  };
  
  const resetSelectedSchool = () => {
    setFormData(prev => ({
      ...prev,
      schoolName: '',
      schoolAddress: ''
    }));
  };

  const compileCustomAddress = () => {
    const addressParts = [
      formData.customStreetAddress,
      formData.customStreetAddress2,
      formData.customCity,
      formData.customCounty,
      formData.customPostalCode,
      formData.customCountry,
    ].filter(Boolean);
    
    return addressParts.join(', ');
  };

  return {
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
  };
};
