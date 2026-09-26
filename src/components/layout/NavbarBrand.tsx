
import React from 'react';
import { Link } from 'react-router-dom';

const NavbarBrand: React.FC = () => {
  return (
    <div className="flex-shrink-0">
      <Link to="/" className="flex items-center">
        <img 
          src="/human-kind-logo.png" 
          alt="Human Kind Staff Wellbeing Award" 
          className="h-20 md:h-20" 
        />
      </Link>
    </div>
  );
};

export default NavbarBrand;
