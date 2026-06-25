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
  User,
  CreditCard,
  Camera,
  Shield,
  Sparkles,
  FileText
} from 'lucide-react';
import { registerVoter, registerFace, verifyAadhaarPhoto } from '../api/backend';

const states = [
  { code: 'AP', name: 'Andhra Pradesh', cities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Rajahmundry', 'Kakinada', 'Anantapur', 'Kadapa'] },
  { code: 'AR', name: 'Arunachal Pradesh', cities: ['Itanagar', 'Tawang', 'Naharlagun', 'Pasighat', 'Bomdila', 'Ziro', 'Along', 'Dibang Valley', 'Changlang', 'Miao'] },
  { code: 'AS', name: 'Assam', cities: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Sivasagar', 'Tezpur', 'Bongaigaon', 'Duliajan', 'North Lakhimpur', 'Karbi Anglong'] },
  { code: 'BR', name: 'Bihar', cities: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia', 'Bihar Sharif', 'Katihar', 'Munger', 'Chhapra'] },
  { code: 'CG', name: 'Chhattisgarh', cities: ['Raipur', 'Bhilai', 'Bilaspur', 'Durg', 'Korba', 'Rajnandgaon', 'Ambikapur', 'Jagdalpur', 'Chirmiri', 'Dhamtari'] },
  { code: 'GA', name: 'Goa', cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Panjim', 'Mapusa', 'Ponda', 'Bicholim', 'Sanquelim', 'Valpoi', 'Canacona'] },
  { code: 'GJ', name: 'Gujarat', cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Morbi'] },
  { code: 'HR', name: 'Haryana', cities: ['Gurgaon', 'Faridabad', 'Rohtak', 'Panipat', 'Karnal', 'Hisar', 'Sonipat', 'Ambala', 'Yamunanagar', 'Kurukshetra'] },
  { code: 'HP', name: 'Himachal Pradesh', cities: ['Shimla', 'Mandi', 'Solan', 'Dharamshala', 'Kullu', 'Manali', 'Chamba', 'Hamirpur', 'Bilaspur', 'Una'] },
  { code: 'JH', name: 'Jharkhand', cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih', 'Ramgarh', 'Phusro', 'Medininagar'] },
  { code: 'KA', name: 'Karnataka', cities: ['Bangalore', 'Mysore', 'Mangalore', 'Hubli', 'Dharwad', 'Belgaum', 'Bellary', 'Tumkur', 'Shimoga', 'Udupi'] },
  { code: 'KL', name: 'Kerala', cities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Kannur', 'Alappuzha', 'Kottayam', 'Malappuram'] },
  { code: 'MP', name: 'Madhya Pradesh', cities: ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'] },
  { code: 'MH', name: 'Maharashtra', cities: ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Navi Mumbai', 'Sangli'] },
  { code: 'MN', name: 'Manipur', cities: ['Imphal', 'Bishnupur', 'Thoubal', 'Ukhrul', 'Churachandpur', 'Kakching', 'Senapati', 'Tengnoupal', 'Jiribam', 'Nungba'] },
  { code: 'ML', name: 'Meghalaya', cities: ['Shillong', 'Tura', 'Jowai', 'Baghmara', 'Nongstoin', 'Williamnagar', 'Mawkyrwat', 'Khliehriat', 'Amlarem', 'Resubelpara'] },
  { code: 'MZ', name: 'Mizoram', cities: ['Aizawl', 'Lunglei', 'Champhai', 'Kolasib', 'Serchhip', 'Saitual', 'Hnahthial', 'Khawzawl', 'Zawlnuam', 'Bairabi'] },
  { code: 'NL', name: 'Nagaland', cities: ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Mon', 'Phek', 'Kiphire', 'Longleng'] },
  { code: 'OD', name: 'Odisha', cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Baripada', 'Bhadrak', 'Angul'] },
  { code: 'PB', name: 'Punjab', cities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur', 'Firozpur', 'Kapurthala', 'Moga'] },
  { code: 'RJ', name: 'Rajasthan', cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Pilani', 'Bhilwara', 'Alwar', 'Sikar'] },
  { code: 'SK', name: 'Sikkim', cities: ['Gangtok', 'Gyalshing', 'Namchi', 'Mangan', 'Rangpo', 'Soreng', 'Gyalshing', 'Pakyong', 'Gezing', 'Jorthang'] },
  { code: 'TN', name: 'Tamil Nadu', cities: ['Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Tirupur', 'Vellore', 'Erode', 'Tirunelveli', 'Dindigul'] },
  { code: 'TS', name: 'Telangana', cities: ['Hyderabad', 'Warangal', 'Secunderabad', 'Karimnagar', 'Khammam', 'Nizamabad', 'Ramagundam', 'Siddipet', 'Mahbubnagar', 'Suryapet'] },
  { code: 'TR', name: 'Tripura', cities: ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailasahar', 'Belonia', 'Khowai', 'Ambassa', 'Bishalgarh', 'Mohanpur', 'Sonamura'] },
  { code: 'UP', name: 'Uttar Pradesh', cities: ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad', 'Meerut', 'Aligarh', 'Bareilly', 'Moradabad', 'Gorakhpur'] },
  { code: 'UK', name: 'Uttarakhand', cities: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Nainital', 'Almora', 'Mussoorie'] },
  { code: 'WB', name: 'West Bengal', cities: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Murshidabad', 'Malda', 'Baharampur', 'Habra', 'Kharagpur'] },
  { code: 'DL', name: 'Delhi', cities: ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi', 'North East Delhi', 'North West Delhi', 'South West Delhi', 'South East Delhi'] },
  { code: 'CH', name: 'Chandigarh', cities: ['Chandigarh'] },
  { code: 'JK', name: 'Jammu and Kashmir', cities: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Kathua', 'Udhampur', 'Pulwama', 'Kupwara', 'Poonch', 'Rajouri'] },
  { code: 'LD', name: 'Ladakh', cities: ['Leh', 'Kargil'] },
  { code: 'PY', name: 'Puducherry', cities: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'] },
  { code: 'AN', name: 'Andaman and Nicobar', cities: ['Port Blair', 'Car Nicobar', 'Havelock', 'Neil Kendra', 'Diglipur', 'Mayabunder', 'Rangat', 'Billy Ground'] },
  { code: 'DN', name: 'Dadra and Nagar Haveli', cities: ['Silvassa', 'Dadra', 'Naroli', 'Daman', 'Kachigam'] },
  { code: 'DD', name: 'Daman and Diu', cities: ['Daman', 'Diu'] },
  { code: 'LA', name: 'Lakshadweep', cities: ['Kavaratti', 'Agatti', 'Amini', 'Andrott', 'Kadmat', 'Kochi', 'Minicoy', 'Chetlat', 'Bitra', 'Bangaram'] }
];

const StepByStepRegistration = ({ account, onRegistrationComplete }) => {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    aadhaarNumber: '',
    voterId: '',
    email: '',
    phone: '',
    state: '',
    city: ''
  });

  // Camera and images
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const aadhaarVideoRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState(null);
  const [capturedAadhaar, setCapturedAadhaar] = useState(null);
  const [aadhaarCameraActive, setAadhaarCameraActive] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const steps = [
    { number: 1, title: 'Personal Info', icon: User, color: 'from-blue-500 to-cyan-500' },
    { number: 2, title: 'Aadhaar Card', icon: FileText, color: 'from-purple-500 to-pink-500' },
    { number: 3, title: 'Face Capture', icon: Camera, color: 'from-orange-500 to-red-500' },
    { number: 4, title: 'Verification', icon: Shield, color: 'from-green-500 to-emerald-500' }
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

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const imageDataUrl = canvasRef.current.toDataURL('image/jpeg');
      setCapturedSelfie(imageDataUrl);
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

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateStep = () => {
    setError('');

    switch (currentStep) {
      case 1:
        if (!formData.name || !formData.aadhaarNumber) {
          setError('Please fill in all required fields');
          return false;
        }
        if (!formData.state) {
          setError('Please select your state');
          return false;
        }
        if (!formData.city) {
          setError('Please select your city');
          return false;
        }
        if (formData.aadhaarNumber.length !== 12) {
          setError('Aadhaar number must be 12 digits');
          return false;
        }
        return true;
      case 2:
        if (!capturedAadhaar) {
          setError('Please capture your Aadhaar card photo');
          return false;
        }
        return true;
      case 3:
        if (!capturedSelfie) {
          setError('Please capture your selfie');
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

      // Auto-start camera when reaching face capture step
      if (nextStepNum === 3 && !capturedSelfie) {
        setTimeout(() => startCamera(), 100);
      }
      // Auto-start Aadhaar camera when reaching Aadhaar step
      if (nextStepNum === 2 && !capturedAadhaar) {
        setTimeout(() => startAadhaarCamera(), 100);
      }
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
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

  const completeRegistration = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Step 1: Verify Aadhaar photo with selfie (MUST PASS FIRST - prevents fraudulent registrations)
      setSuccess('Step 1/3: Verifying face with Aadhaar card...');
      const aadhaarResult = await verifyAadhaarPhoto(
        account,
        capturedAadhaar,
        capturedSelfie
      );

      console.log('Aadhaar verification result:', aadhaarResult);

      if (!aadhaarResult?.success) {
        const errorMsg = aadhaarResult?.error || aadhaarResult?.message || 'Face verification failed. Your selfie does not match the photo on your Aadhaar card.';
        throw new Error(errorMsg);
      }

      setSuccess(`✅ Face verified! Confidence: ${(aadhaarResult.confidence * 100).toFixed(1)}%`);

      // Step 2: Register voter in blockchain (ONLY if face verification passed)
      setSuccess('Step 2/3: Registering voter in blockchain...');
      const registerResult = await registerVoter(
        account,
        formData.aadhaarNumber,
        formData.voterId,
        formData.name,
        formData.email,
        formData.phone,
        formData.state,
        formData.city
      );

      // Step 3: Register face biometrics and save Aadhaar image (ONLY if voter registration succeeded)
      setSuccess('Step 3/3: Registering face biometrics and saving Aadhaar...');
      const faceResult = await registerFace(account, capturedSelfie, capturedAadhaar);

      setSuccess('✅ Registration completed successfully! You can now login.');
      setTimeout(() => {
        if (onRegistrationComplete) onRegistrationComplete();
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed. Please try again.');
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
                <User className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Personal Information</h3>
              <p className="text-gray-600 mt-2">Let&apos;s start with your basic details</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-semibold">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="mt-1.5 h-12"
                />
              </div>

              <div>
                <Label htmlFor="aadhaarNumber" className="text-sm font-semibold">Aadhaar Number *</Label>
                <Input
                  id="aadhaarNumber"
                  name="aadhaarNumber"
                  value={formData.aadhaarNumber}
                  onChange={handleInputChange}
                  placeholder="Enter 12-digit Aadhaar number"
                  maxLength={12}
                  className="mt-1.5 h-12"
                />
              </div>

              <div>
                <Label htmlFor="voterId" className="text-sm font-semibold">Voter ID (Optional)</Label>
                <Input
                  id="voterId"
                  name="voterId"
                  value={formData.voterId}
                  onChange={handleInputChange}
                  placeholder="Enter voter ID"
                  className="mt-1.5 h-12"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-semibold">Email (Optional)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                  className="mt-1.5 h-12"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-semibold">Phone (Optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 XXXXXXXXXX"
                  className="mt-1.5 h-12"
                />
              </div>

              <div>
                <Label htmlFor="state" className="text-sm font-semibold">State *</Label>
                <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="mt-1.5 h-12 w-full px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select State</option>
                  {states.map(state => (
                    <option key={state.code} value={state.code}>{state.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="city" className="text-sm font-semibold">City *</Label>
                <select
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="mt-1.5 h-12 w-full px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.state}
                >
                  <option value="">Select City</option>
                  {formData.state && states.find(s => s.code === formData.state)?.cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Aadhaar Card Photo</h3>
              <p className="text-gray-600 mt-2">Capture a clear photo of your Aadhaar card</p>
            </div>

            <div className="space-y-4">
              {!capturedAadhaar ? (
                <div className="space-y-4">
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
                          <Camera className="w-16 h-16 text-gray-400" />
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
                        Capture Photo
                      </Button>
                    )}

                    <Label htmlFor="aadhaar-upload" className="flex-1">
                      <div className="h-12 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                        <FileText className="mr-2 h-5 w-5" />
                        Upload File
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

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-blue-800">
                      📸 Make sure your Aadhaar card is clearly visible and the photo on it is recognizable
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border-4 border-green-500">
                    <img src={capturedAadhaar} alt="Aadhaar Card" className="w-full" />
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Captured
                    </div>
                  </div>
                  <Button
                    onClick={() => setCapturedAadhaar(null)}
                    variant="outline"
                    className="w-full h-12"
                  >
                    Retake Photo
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 mb-4">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Face Verification</h3>
              <p className="text-gray-600 mt-2">Take a clear selfie for verification</p>
            </div>

            <div className="space-y-4">
              {!capturedSelfie ? (
                <div className="space-y-4">
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

                  <div className="space-y-3">
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
                        onClick={captureSelfie}
                        className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      >
                        <Camera className="mr-2 h-5 w-5" />
                        Capture Selfie
                      </Button>
                    )}

                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertDescription className="text-blue-800">
                        😊 Look directly at the camera and ensure your face is well-lit
                      </AlertDescription>
                    </Alert>

                    {!isCameraActive && (
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertDescription className="text-yellow-800 text-xs">
                          💡 <strong>Tip:</strong> When prompted, click &quot;Allow&quot; to grant camera access.
                          Check the browser address bar for camera permission requests.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border-4 border-green-500">
                    <img src={capturedSelfie} alt="Selfie" className="w-full" />
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Captured
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setCapturedSelfie(null);
                      startCamera();
                    }}
                    variant="outline"
                    className="w-full h-12"
                  >
                    Retake Selfie
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
              <h3 className="text-2xl font-bold text-gray-900">Review & Submit</h3>
              <p className="text-gray-600 mt-2">Please review your information before submitting</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Personal Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-semibold">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Aadhaar:</span>
                    <span className="font-semibold">XXXX-XXXX-{formData.aadhaarNumber.slice(-4)}</span>
                  </div>
                  {formData.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-semibold">{formData.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">State:</span>
                    <span className="font-semibold">{states.find(s => s.code === formData.state)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">City:</span>
                    <span className="font-semibold">{formData.city}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-purple-600" />
                    Aadhaar Card
                  </h4>
                  <div className="aspect-video rounded-lg overflow-hidden border-2 border-white">
                    <img src={capturedAadhaar} alt="Aadhaar" className="w-full h-full object-cover" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm flex items-center">
                    <Camera className="w-4 h-4 mr-2 text-orange-600" />
                    Your Selfie
                  </h4>
                  <div className="aspect-video rounded-lg overflow-hidden border-2 border-white">
                    <img src={capturedSelfie} alt="Selfie" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse mb-4">
                    <Sparkles className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <p className="text-gray-600 font-medium">{success || 'Processing...'}</p>
                </div>
              ) : (
                <Button
                  onClick={completeRegistration}
                  disabled={loading}
                  className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-lg font-semibold"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Complete Registration
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
            <CardTitle className="text-3xl font-bold">Voter Registration</CardTitle>
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

            {success && !loading && (
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

export default StepByStepRegistration;
