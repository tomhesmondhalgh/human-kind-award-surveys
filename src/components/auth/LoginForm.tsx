
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ForgotPasswordModal from './ForgotPasswordModal';

interface LoginFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  initialEmail?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading = false, initialEmail }) => {
  const [formData, setFormData] = useState({
    email: initialEmail || '',
    password: '',
  });
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="max-w-md w-full mx-auto glass-card rounded-2xl p-8 animate-slide-up">
      <h2 className="text-2xl font-bold text-center mb-6">
        Log in to your account
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="form-input w-full"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="form-input w-full"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
        
        <div className="text-right">
          <button 
            type="button"
            className="text-sm text-brandPurple-600 hover:text-brandPurple-800 font-medium"
            onClick={() => setForgotPasswordOpen(true)}
            disabled={isLoading}
          >
            Forgot password?
          </button>
        </div>
        
        <div>
          <button 
            type="submit" 
            className="btn-primary w-full mt-2 flex justify-center items-center" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              <>Log in</>
            )}
          </button>
        </div>
      </form>
      
      <div className="mt-6 text-center text-sm">
        <p>
          Don't have an account?{' '}
          <Link to="/signup" className="text-brandPurple-600 hover:text-brandPurple-700 font-medium">
            Sign up
          </Link>
        </p>
      </div>

      <ForgotPasswordModal 
        isOpen={forgotPasswordOpen} 
        onClose={() => setForgotPasswordOpen(false)} 
      />
    </div>
  );
};

export default LoginForm;
