import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, LogIn, Sparkles } from 'lucide-react';
import StepByStepRegistration from './StepByStepRegistration';
import StepByStepLogin from './StepByStepLogin';

const AuthFlow = ({ walletAddress, onAuthSuccess }) => {
  const [mode, setMode] = useState('welcome'); // 'welcome', 'login', 'register'

  const handleRegistrationSuccess = () => {
    console.log('Registration successful');
    setMode('login');
  };

  const handleLoginSuccess = (result) => {
    console.log('Login successful:', result);
    if (onAuthSuccess) {
      onAuthSuccess(result);
    }
  };

  if (mode === 'login') {
    return (
      <div>
        <Button
          onClick={() => setMode('welcome')}
          variant="ghost"
          className="fixed top-4 left-4 z-50"
        >
          ← Back
        </Button>
        <StepByStepLogin account={walletAddress} onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  if (mode === 'register') {
    return (
      <div>
        <Button
          onClick={() => setMode('welcome')}
          variant="ghost"
          className="fixed top-4 left-4 z-50"
        >
          ← Back
        </Button>
        <StepByStepRegistration account={walletAddress} onRegistrationComplete={handleRegistrationSuccess} />
      </div>
    );
  }

  // Welcome screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-6 animate-bounce">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Intelligent Blockchain-Based E-Voting with Voice & Sign Authentication
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Your vote matters. Cast it securely with blockchain technology.
          </p>
          <p className="text-gray-500">
            Powered by multi-factor authentication and biometric verification
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Login Card */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
            <div className="relative bg-white rounded-2xl p-8 shadow-xl border-2 border-transparent hover:border-blue-300 transition-all duration-300">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-6">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Login</h2>
              <p className="text-gray-600 mb-6">
                Already registered? Sign in securely with your wallet, OTP, and biometric verification.
              </p>
              <ul className="space-y-2 mb-6 text-sm text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                  Multi-factor authentication
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                  Face & Aadhaar verification
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                  Secure blockchain wallet
                </li>
              </ul>
              <Button
                onClick={() => setMode('login')}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-lg"
              >
                Login Now
                <LogIn className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Register Card */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
            <div className="relative bg-white rounded-2xl p-8 shadow-xl border-2 border-transparent hover:border-purple-300 transition-all duration-300">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-6">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Register</h2>
              <p className="text-gray-600 mb-6">
                New voter? Create your account in just a few simple steps with our guided registration process.
              </p>
              <ul className="space-y-2 mb-6 text-sm text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                  Step-by-step guidance
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                  Aadhaar card verification
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                  Quick & easy process
                </li>
              </ul>
              <Button
                onClick={() => setMode('register')}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-lg"
              >
                Register Now
                <UserPlus className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
            <div className="text-2xl font-bold text-purple-600 mb-1">🔐</div>
            <p className="text-sm font-semibold text-gray-900">Secure</p>
            <p className="text-xs text-gray-600">Blockchain powered</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
            <div className="text-2xl font-bold text-blue-600 mb-1">🎯</div>
            <p className="text-sm font-semibold text-gray-900">Transparent</p>
            <p className="text-xs text-gray-600">Verifiable results</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
            <div className="text-2xl font-bold text-pink-600 mb-1">⚡</div>
            <p className="text-sm font-semibold text-gray-900">Fast</p>
            <p className="text-xs text-gray-600">Quick verification</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthFlow;
