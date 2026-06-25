import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Camera, User, CreditCard, Mail, Phone } from 'lucide-react';
import { registerVoter, registerFace } from '../api/backend';

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

const EnhancedRegistration = ({ walletAddress, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Face Capture
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    aadhaarNumber: '',
    voterID: '',
    email: '',
    phone: '',
    state: '',
    city: '',
  });

  // Face capture
  const [faceImage, setFaceImage] = useState(null);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.aadhaarNumber.trim() || formData.aadhaarNumber.length !== 12) {
      setError('Valid 12-digit Aadhaar number is required');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Valid email is required');
      return false;
    }
    if (!formData.state) {
      setError('State is required');
      return false;
    }
    if (!formData.city) {
      setError('City is required');
      return false;
    }
    return true;
  };

  const handleStep1Submit = async () => {
    setError('');
    setSuccess('');

    if (!validateStep1()) return;

    setLoading(true);

    try {
      const result = await registerVoter(
        walletAddress,
        formData.aadhaarNumber,
        formData.voterID || null,
        formData.name,
        formData.email,
        formData.phone || null,
        formData.state,
        formData.city
      );

      setSuccess('Basic registration successful! Now capture your face for biometric verification.');
      setTimeout(() => {
        setStep(2);
        setSuccess('');
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Registration failed';
      setError(errorMsg);
    }

    setLoading(false);
  };

  const startCamera = async () => {
    setError('');
    try {
      console.log('Requesting camera access...');

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Your browser does not support camera access');
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      console.log('Camera access granted');
      console.log('Stream active:', mediaStream.active);
      console.log('Video tracks:', mediaStream.getVideoTracks().length);

      if (mediaStream.getVideoTracks().length === 0) {
        setError('No video tracks found in stream');
        return;
      }

      setStream(mediaStream);

    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on your device.');
      } else {
        setError(`Failed to access camera: ${err.message}`);
      }
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera...');
    if (stream) {
      stream.getTracks().forEach((track) => {
        console.log('Stopping track:', track.kind, track.label);
        track.stop();
      });
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStream(null);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Check if video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Video not ready. Please wait a moment and try again.');
      return;
    }

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Validate the image
    if (!imageDataUrl || imageDataUrl.length < 1000) {
      setError('Failed to capture image. Please try again.');
      return;
    }

    console.log('Captured image size:', imageDataUrl.length);
    setFaceImage(imageDataUrl);
    stopCamera();
  };

  const retakeImage = () => {
    setFaceImage(null);
    startCamera();
  };

  const handleFaceSubmit = async () => {
    if (!faceImage) {
      setError('Please capture your face image');
      return;
    }

    // Validate face image is not empty
    if (faceImage.length < 1000) {
      setError('Invalid image captured. Please retake the photo.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Submitting face image, size:', faceImage.length);
      const result = await registerFace(walletAddress, faceImage);
      setSuccess('Face registration successful! You can now login with MFA.');

      setTimeout(() => {
        if (onSuccess) onSuccess(result);
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Face registration failed';
      setError(`Face registration failed: ${errorMsg}`);
      console.error('Face registration error:', err);
    }

    setLoading(false);
  };

  // Connect stream to video element when stream changes
  React.useEffect(() => {
    if (stream && videoRef.current) {
      console.log('Effect: Connecting stream to video element');
      const video = videoRef.current;
      video.srcObject = stream;

      // Force play
      video.onloadedmetadata = async () => {
        try {
          console.log('Metadata loaded, attempting to play video');
          await video.play();
          console.log('Video is now playing');
        } catch (e) {
          console.error('Play error:', e);
          setError('Failed to play video: ' + e.message);
        }
      };
    }
  }, [stream]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="w-5 h-5 mr-2" />
          Voter Registration {step === 2 && '- Biometric Verification'}
        </CardTitle>
        <CardDescription>
          {step === 1
            ? 'Enter your details with Aadhaar verification'
            : 'Capture your face for biometric authentication'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="As per Aadhaar"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="aadhaarNumber">Aadhaar Number *</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="aadhaarNumber"
                  name="aadhaarNumber"
                  value={formData.aadhaarNumber}
                  onChange={handleInputChange}
                  placeholder="123456789012"
                  maxLength={12}
                  disabled={loading}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">12-digit Aadhaar number</p>
            </div>

            <div>
              <Label htmlFor="voterID">Voter ID (Optional)</Label>
              <Input
                id="voterID"
                name="voterID"
                value={formData.voterID}
                onChange={handleInputChange}
                placeholder="ABC1234567"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                  disabled={loading}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">For OTP verification</p>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+919876543210"
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="state">State *</Label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full p-2 border rounded mt-1"
                disabled={loading}
              >
                <option value="">Select State</option>
                {states.map(state => (
                  <option key={state.code} value={state.code}>{state.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="city">City *</Label>
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full p-2 border rounded mt-1"
                disabled={loading || !formData.state}
              >
                <option value="">Select City</option>
                {formData.state && states.find(s => s.code === formData.state)?.cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <Button onClick={handleStep1Submit} disabled={loading} className="w-full mt-4">
              {loading ? 'Registering...' : 'Continue to Face Verification'}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              {!stream && !faceImage && (
                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-lg p-8">
                    <Camera className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Click below to start your camera</p>
                  </div>
                  <Button onClick={startCamera} className="w-full">
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
              )}

              {stream && !faceImage && (
                <div className="space-y-4">
                  <div className="bg-black rounded-lg p-4">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        width="640"
                        height="480"
                        className="mx-auto rounded"
                        onLoadedMetadata={(e) => {
                          console.log('Video metadata loaded event');
                          console.log('Video dimensions:', e.target.videoWidth, 'x', e.target.videoHeight);
                        }}
                        onPlay={() => console.log('Video play event fired')}
                        onError={(e) => {
                          console.error('Video error:', e);
                          setError('Video element error');
                        }}
                      />
                      {stream && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1.5 rounded text-sm font-medium shadow-lg">
                          📹 Camera Active
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={captureImage} className="flex-1" size="lg">
                      <Camera className="w-4 h-4 mr-2" />
                      Capture Photo
                    </Button>
                    <Button onClick={stopCamera} variant="outline" className="flex-1" size="lg">
                      Cancel
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Position your face in the center and ensure good lighting
                  </p>
                  <p className="text-xs text-gray-500 text-center">
                    Debug: Stream active = {stream?.active ? 'Yes' : 'No'},
                    Tracks = {stream?.getVideoTracks().length || 0}
                  </p>
                </div>
              )}

              {faceImage && (
                <div className="space-y-4">
                  <img src={faceImage} alt="Captured face" className="w-full rounded-lg border-2 border-green-500" />
                  <div className="flex gap-2">
                    <Button onClick={handleFaceSubmit} disabled={loading} className="flex-1">
                      {loading ? 'Submitting...' : 'Submit & Complete Registration'}
                    </Button>
                    <Button onClick={retakeImage} variant="outline" className="flex-1" disabled={loading}>
                      Retake Photo
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedRegistration;
