import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Mail,
  Camera,
  Shield,
  Lock,
  FileText,
  Sparkles
} from 'lucide-react';
import { requestOTP, verifyLogin } from '../api/backend';

const StepByStepLogin = ({ account, onLoginSuccess }) => {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form data
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Camera and images
  const videoRef = useRef(null);
  const aadhaarVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [aadhaarCameraActive, setAadhaarCameraActive] = useState(false);
  const [capturedFace, setCapturedFace] = useState(null);
  const [capturedAadhaar, setCapturedAadhaar] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const steps = [
    { number: 1, title: 'Wallet', icon: Wallet, color: 'from-blue-500 to-cyan-500' },
    { number: 2, title: 'OTP Verification', icon: Mail, color: 'from-purple-500 to-pink-500' },
    { number: 3, title: 'Face & Aadhaar', icon: Camera, color: 'from-orange-500 to-red-500' },
    { number: 4, title: 'Authentication', icon: Shield, color: 'from-green-500 to-emerald-500' }
  ];

  const progress = (currentStep / totalSteps) * 100;

  // Cleanup cameras on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopAadhaarCamera();
    };
  }, []);

  // Camera functions
  const startCamera = async () => {
    try {
      setError('');
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      console.log('Camera access granted:', stream);
      console.log('Stream tracks:', stream.getTracks());
      console.log('Video ref exists:', !!videoRef.current);

      if (videoRef.current) {
        console.log('Setting srcObject...');
        videoRef.current.srcObject = stream;

        // Set camera active immediately for Firefox
        setIsCameraActive(true);

        // Firefox fix: Try to play immediately
        console.log('Attempting to play video...');
        try {
          await videoRef.current.play();
          console.log('✅ Video is now playing!');
        } catch (playErr) {
          console.log('Direct play failed, waiting for metadata...', playErr);

          // Fallback: wait for metadata
          videoRef.current.onloadedmetadata = async () => {
            console.log('Video metadata loaded');
            try {
              await videoRef.current.play();
              console.log('✅ Video playing after metadata');
            } catch (err) {
              console.error('Error playing video:', err);
              setError('Failed to start video playback');
            }
          };
        }
      } else {
        console.error('Video ref is null!');
        setError('Video element not found');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError(`Camera access denied: ${err.message}. Please allow camera permissions in your browser.`);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const captureFace = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const imageDataUrl = canvasRef.current.toDataURL('image/jpeg');
      setCapturedFace(imageDataUrl);
      stopCamera();
    }
  };

  const startAadhaarCamera = async () => {
    try {
      setError('');
      console.log('Requesting Aadhaar camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: 'environment' }
        }
      });
      console.log('Aadhaar camera access granted:', stream);
      console.log('Stream tracks:', stream.getTracks());
      console.log('Video ref exists:', !!aadhaarVideoRef.current);

      if (aadhaarVideoRef.current) {
        console.log('Setting srcObject...');
        aadhaarVideoRef.current.srcObject = stream;

        // Set camera active immediately for Firefox
        setAadhaarCameraActive(true);

        // Firefox fix: Try to play immediately
        console.log('Attempting to play video...');
        try {
          await aadhaarVideoRef.current.play();
          console.log('✅ Aadhaar video is now playing!');
        } catch (playErr) {
          console.log('Direct play failed, waiting for metadata...', playErr);

          // Fallback: wait for metadata
          aadhaarVideoRef.current.onloadedmetadata = async () => {
            console.log('Aadhaar video metadata loaded');
            try {
              await aadhaarVideoRef.current.play();
              console.log('✅ Aadhaar video playing after metadata');
            } catch (err) {
              console.error('Error playing Aadhaar video:', err);
              setError('Failed to start video playback');
            }
          };
        }
      } else {
        console.error('Video ref is null!');
        setError('Video element not found');
      }
    } catch (err) {
      console.error('Aadhaar camera error:', err);
      setError(`Camera access denied: ${err.message}. Please allow camera permissions in your browser.`);
    }
  };

  const stopAadhaarCamera = () => {
    if (aadhaarVideoRef.current && aadhaarVideoRef.current.srcObject) {
      const tracks = aadhaarVideoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      aadhaarVideoRef.current.srcObject = null;
      setAadhaarCameraActive(false);
    }
  };

  const captureAadhaar = () => {
    if (aadhaarVideoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = aadhaarVideoRef.current.videoWidth;
      canvasRef.current.height = aadhaarVideoRef.current.videoHeight;
      context.drawImage(aadhaarVideoRef.current, 0, 0);
      const imageDataUrl = canvasRef.current.toDataURL('image/jpeg');
      setCapturedAadhaar(imageDataUrl);
      stopAadhaarCamera();
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'aadhaar') {
          setCapturedAadhaar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = () => {
    setError('');

    switch (currentStep) {
      case 1:
        if (!account) {
          setError('Please connect your wallet first');
          return false;
        }
        return true;
      case 2:
        if (!otpSent) {
          setError('Please request OTP first');
          return false;
        }
        if (!otpCode || otpCode.length !== 6) {
          setError('Please enter the 6-digit OTP');
          return false;
        }
        return true;
      case 3:
        if (!capturedFace) {
          setError('Please capture your face for verification');
          return false;
        }
        if (!capturedAadhaar) {
          setError('Please capture your Aadhaar card');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      const nextStepNum = currentStep + 1;
      setCurrentStep(nextStepNum);

      // Auto-start camera when reaching biometric step
      if (nextStepNum === 3 && !capturedFace) {
        setTimeout(() => startCamera(), 100);
      }
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleRequestOTP = async () => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await requestOTP(account, 'email');
      setOtpSent(true);
      setSuccess('OTP sent successfully! Check your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      setSuccess('Verifying OTP...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setSuccess('Verifying face...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setSuccess('Verifying Aadhaar...');
      const result = await verifyLogin(account, otpCode, capturedFace, capturedAadhaar);

      setSuccess('✅ Login successful! Redirecting...');

      // Store token
      if (result.token) {
        localStorage.setItem('auth_token', result.token);
      }

      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(result);
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }

    setLoading(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
                <Wallet className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Connect Wallet</h3>
              <p className="text-gray-600 mt-2">Your wallet is your identity</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-700">Wallet Address</span>
                {account && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">Connected</span>
                  </div>
                )}
              </div>

              {account ? (
                <div className="bg-white rounded-lg p-4 font-mono text-sm break-all border-2 border-blue-300">
                  {account}
                </div>
              ) : (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-yellow-800">
                    ⚠️ Please connect your MetaMask wallet from the header
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {account && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800">
                  Great! Your wallet is connected. Click Next to continue.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">OTP Verification</h3>
              <p className="text-gray-600 mt-2">We&apos;ll send a code to your registered email</p>
            </div>

            {!otpSent ? (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Click the button below to receive a 6-digit OTP on your registered email address
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleRequestOTP}
                  disabled={loading}
                  className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg font-semibold"
                >
                  {loading ? (
                    <>
                      <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-5 w-5" />
                      Request OTP
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <AlertDescription className="text-green-800 font-medium">
                    OTP sent successfully! Check your email.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="otp" className="text-sm font-semibold">Enter 6-Digit OTP</Label>
                  <Input
                    id="otp"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="mt-1.5 h-14 text-center text-2xl font-bold tracking-widest"
                  />
                </div>

                <Button
                  onClick={handleRequestOTP}
                  variant="outline"
                  disabled={loading}
                  className="w-full"
                >
                  Resend OTP
                </Button>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 mb-4">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Biometric Verification</h3>
              <p className="text-gray-600 mt-2">Capture your face and Aadhaar card</p>
            </div>

            {/* Face Capture */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <Camera className="w-5 h-5 mr-2 text-orange-600" />
                Step 1: Capture Your Face
              </h4>

              {!capturedFace ? (
                <div className="space-y-3">
                  <div className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ paddingTop: '56.25%' }}>
                    <div className="absolute inset-0">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{
                          display: isCameraActive ? 'block' : 'none',
                          transform: 'scaleX(-1)'
                        }}
                      />
                      {!isCameraActive && (
                        <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-700 to-gray-900">
                          <Camera className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {!isCameraActive ? (
                    <Button
                      onClick={startCamera}
                      className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      <Camera className="mr-2 h-5 w-5" />
                      Start Camera
                    </Button>
                  ) : (
                    <Button
                      onClick={captureFace}
                      className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      <Camera className="mr-2 h-5 w-5" />
                      Capture Face
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border-4 border-green-500">
                    <img src={capturedFace} alt="Face" className="w-full" />
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Captured
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setCapturedFace(null);
                      startCamera();
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Retake
                  </Button>
                </div>
              )}
            </div>

            {/* Aadhaar Capture */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-purple-600" />
                Step 2: Capture Aadhaar Card
              </h4>

              {!capturedAadhaar ? (
                <div className="space-y-3">
                  <div className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ paddingTop: '56.25%' }}>
                    <div className="absolute inset-0">
                      <video
                        ref={aadhaarVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ display: aadhaarCameraActive ? 'block' : 'none' }}
                      />
                      {!aadhaarCameraActive && (
                        <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-700 to-gray-900">
                          <FileText className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {!aadhaarCameraActive ? (
                      <Button
                        onClick={startAadhaarCamera}
                        className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        <Camera className="mr-2 h-5 w-5" />
                        Start Camera
                      </Button>
                    ) : (
                      <Button
                        onClick={captureAadhaar}
                        className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      >
                        <Camera className="mr-2 h-5 w-5" />
                        Capture
                      </Button>
                    )}

                    <Label htmlFor="aadhaar-upload" className="flex-1">
                      <div className="h-12 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                        <FileText className="mr-2 h-5 w-5" />
                        Upload
                      </div>
                      <Input
                        id="aadhaar-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'aadhaar')}
                        className="hidden"
                      />
                    </Label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border-4 border-green-500">
                    <img src={capturedAadhaar} alt="Aadhaar" className="w-full" />
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Captured
                    </div>
                  </div>
                  <Button
                    onClick={() => setCapturedAadhaar(null)}
                    variant="outline"
                    className="w-full"
                  >
                    Retake
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 mb-4">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Final Authentication</h3>
              <p className="text-gray-600 mt-2">Review and authenticate your login</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200 text-center">
                  <Lock className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-xs font-semibold text-gray-700">OTP Verified</p>
                  <CheckCircle className="w-5 h-5 mx-auto mt-1 text-green-600" />
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200 text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-xs font-semibold text-gray-700">Face Ready</p>
                  <CheckCircle className="w-5 h-5 mx-auto mt-1 text-green-600" />
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200 text-center">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-xs font-semibold text-gray-700">Aadhaar Ready</p>
                  <CheckCircle className="w-5 h-5 mx-auto mt-1 text-green-600" />
                </div>
              </div>

              <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <Shield className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-gray-800">
                  <strong>Security Notice:</strong> Your biometric data is encrypted and secure. We will verify your identity using multiple factors.
                </AlertDescription>
              </Alert>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse mb-4">
                    <Sparkles className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <p className="text-gray-600 font-medium">{success || 'Authenticating...'}</p>
                </div>
              ) : (
                <Button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-lg font-semibold"
                >
                  <Shield className="mr-2 h-5 w-5" />
                  Authenticate & Login
                </Button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="relative">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300
                    ${currentStep >= step.number
                      ? `bg-gradient-to-br ${step.color} border-white shadow-lg scale-110`
                      : 'bg-white border-gray-300'
                    }
                  `}>
                    {currentStep > step.number ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <step.icon className={`w-6 h-6 ${currentStep >= step.number ? 'text-white' : 'text-gray-400'}`} />
                    )}
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <p className={`text-xs font-semibold ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    h-1 w-20 mx-2 rounded-full transition-all duration-300
                    ${currentStep > step.number ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2 mt-8" />
        </div>

        {/* Main Card */}
        <Card className="border-2 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
            <CardTitle className="text-3xl font-bold">Secure Login</CardTitle>
            <CardDescription className="text-indigo-100">
              Step {currentStep} of {totalSteps} - {steps[currentStep - 1].title}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {success && !loading && currentStep !== 4 && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800 font-medium">{success}</AlertDescription>
              </Alert>
            )}

            {renderStepContent()}

            {/* Navigation Buttons */}
            {currentStep < totalSteps && !loading && (
              <div className="flex gap-4 mt-8">
                {currentStep > 1 && (
                  <Button
                    onClick={prevStep}
                    variant="outline"
                    className="flex-1 h-12"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Previous
                  </Button>
                )}
                <Button
                  onClick={nextStep}
                  className={`flex-1 h-12 bg-gradient-to-r ${steps[currentStep - 1].color}`}
                >
                  Next
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default StepByStepLogin;
