import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import type { UserCreate } from '../types/auth';
import { 
  EyeIcon, 
  EyeSlashIcon,
  AcademicCapIcon,
  TrophyIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserCreate>({
    email: '',
    full_name: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const signupMutation = useMutation({
    mutationFn: (userData: UserCreate) => authApi.signup(userData),
    onSuccess: () => {
      navigate('/login', { 
        state: { message: 'Account created successfully! Please log in.' }
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create account';
      if (message.includes('Email already registered')) {
        setErrors({ email: 'This email is already registered' });
      } else {
        setErrors({ general: message });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.full_name) newErrors.full_name = 'Full name is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    signupMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <img 
                src="/rebelz-logo.svg" 
                alt="Rebelz" 
                className="h-10 w-auto"
              />
            </div>
            <Link 
              to="/login" 
              className="text-secondary hover:text-secondary-700 font-medium"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left side - Hero content */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-primary relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
            <div className="max-w-md">
              <h2 className="text-4xl xl:text-5xl font-bold mb-6">
                Join the Rebelz Community
              </h2>
              <p className="text-xl mb-8 text-gray-300">
                Discover basketball programs, educational workshops, and connect with players and coaches in Philadelphia.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                    <TrophyIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Elite Training Programs</h3>
                    <p className="text-gray-300">Join leagues, clinics, and camps</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                    <AcademicCapIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Educational Excellence</h3>
                    <p className="text-gray-300">STEM programs and workforce readiness</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                    <UsersIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Community Network</h3>
                    <p className="text-gray-300">Connect with coaches, players, and families</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-10 right-10 w-32 h-32 bg-secondary bg-opacity-20 rounded-full"></div>
          <div className="absolute bottom-10 right-32 w-20 h-20 bg-secondary bg-opacity-20 rounded-full"></div>
          <div className="absolute top-1/2 right-5 w-16 h-16 bg-secondary bg-opacity-20 rounded-full"></div>
        </div>

        {/* Right side - Signup form */}
        <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Create Your Account
              </h2>
              <p className="text-gray-600">
                Start your journey with Rebelz Basketball
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {errors.general}
                </div>
              )}

              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent transition-colors ${
                    errors.full_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent transition-colors ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent transition-colors pr-12 ${
                      errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters long
                </p>
              </div>

              <button
                type="submit"
                disabled={signupMutation.isPending}
                className="w-full bg-secondary text-white py-3 px-4 rounded-lg font-medium hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {signupMutation.isPending ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-secondary hover:text-secondary-700">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-secondary hover:text-secondary-700">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
