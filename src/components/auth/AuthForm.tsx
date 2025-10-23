
import React from 'react';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';
import { SignUpFormData } from '../../types/auth';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  invitationData?: any;
  initialEmail?: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ 
  mode, 
  onSubmit, 
  isLoading = false,
  invitationData,
  initialEmail
}) => {
  console.log('AuthForm rendering with mode:', mode); // Add debugging
  
  // Explicitly check the mode to ensure correct form rendering
  if (mode === 'login') {
    console.log('Rendering LoginForm component');
    return <LoginForm onSubmit={onSubmit} isLoading={isLoading} />;
  }
  
  console.log('Rendering SignUpForm component');
  return (
    <SignUpForm 
      onSubmit={(data: SignUpFormData) => {
        console.log('SignUpForm submitted with data:', data);
        onSubmit(data);
      }} 
      isLoading={isLoading}
      invitationData={invitationData}
      initialEmail={initialEmail}
    />
  );
};

export default AuthForm;
