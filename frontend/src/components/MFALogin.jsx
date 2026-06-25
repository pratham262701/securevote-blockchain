import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Camera, Shield, Lock, Mail } from 'lucide-react';
import { requestOTP, verifyLogin, getVoterInfo } from '../api/backend';

const MFALogin = ({ walletAddress, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify OTP + Face
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [faceImage, setFaceImage] = useState(null);
  const [stream, setStream] = useState(null);
  const [voterInfo, setVoterInfo] = useState(null);
  const [expiryMinutes, setExpiryMinutes] = useState(5);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Check if voter is registered
  useEffect(() => {
    checkVoterStatus();
  }, [walletAddress]);

  const checkVoterStatus = async () => {
    try {
      const result = await getVoterInfo(walletAddress);
      setVoterInfo(result.voter);

      if (!result.voter.is_registered) {
        setError('You are not registered. Please complete registration first.');
      }
    } catch (err) {
      setError('Voter not found. Please register first.');
    }
  };

  const handleRequestOTP = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await requestOTP(walletAddress, 'email');
      setSuccess(`OTP sent to your email! Valid for ${result.expires_in_minutes} minutes.`);
      setExpiryMinutes(result.expires_in_minutes);
      setStep(2);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to send OTP';
      setError(errorMsg);
    }

    setLoading(false);
  };

  const startCamera = async () => {
    setError('');
    try {
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
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
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
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Validate the image
    if (!imageDataUrl || imageDataUrl.length < 1000) {
      setError('Failed to capture image. Please try again.');
      return;
    }

    setFaceImage(imageDataUrl);
    stopCamera();
  };

  const retakeImage = () => {
    setFaceImage(null);
    startCamera();
  };

  const handleVerifyLogin = async () => {
    setError('');
    setSuccess('');

    const trimmedOtp = otpCode.trim();

    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setError('Please enter valid 6-digit OTP');
      return;
    }

    if (!faceImage) {
      setError('Please capture your face for verification');
      return;
    }

    setLoading(true);

    try {
      console.log('[DEBUG] Verifying login with OTP:', trimmedOtp);
      const result = await verifyLogin(walletAddress, trimmedOtp, faceImage);

      // Store auth token
      localStorage.setItem('auth_token', result.token);

      setSuccess(`Authentication successful! Face confidence: ${result.face_confidence}%`);

      setTimeout(() => {
        if (onSuccess) onSuccess(result);
      }, 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Authentication failed';
      setError(errorMsg);
    }

    setLoading(false);
  };

  // Connect stream to video element when stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;

      // Force play
      video.onloadedmetadata = async () => {
        try {
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
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!voterInfo || !voterInfo.is_registered) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <XCircle className="w-5 h-5 mr-2" />
            Not Registered
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error || 'You need to complete registration before logging in.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Multi-Factor Authentication
        </CardTitle>
        <CardDescription>
          {step === 1
            ? 'Request OTP to verify your identity'
            : 'Enter OTP and verify your face'}
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

        {/* Voter Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Voter Information</h3>
          <div className="text-sm space-y-1">
            <p><strong>Name:</strong> {voterInfo?.name}</p>
            <p><strong>Email:</strong> {voterInfo?.email}</p>
            <p><strong>Aadhaar:</strong> {voterInfo?.aadhaar_number}</p>
            <div className="flex gap-2 mt-2">
              {voterInfo?.is_verified && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Verified</span>
              )}
              {voterInfo?.has_voted && (
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Already Voted</span>
              )}
            </div>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                An OTP will be sent to your registered email address: <strong>{voterInfo?.email}</strong>
              </AlertDescription>
            </Alert>

            <Button onClick={handleRequestOTP} disabled={loading} className="w-full" size="lg">
              <Lock className="w-4 h-4 mr-2" />
              {loading ? 'Sending OTP...' : 'Request OTP'}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* OTP Input */}
            <div>
              <Label htmlFor="otpCode">Enter 6-Digit OTP</Label>
              <Input
                id="otpCode"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                disabled={loading}
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-1">
                OTP expires in {expiryMinutes} minutes. Check your email.
              </p>
            </div>

            {/* Face Capture */}
            <div>
              <Label>Face Verification</Label>
              <div className="mt-2">
                {!stream && !faceImage && (
                  <div className="space-y-4">
                    <div className="bg-gray-100 rounded-lg p-8 text-center">
                      <Camera className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">Capture your face for verification</p>
                    </div>
                    <Button onClick={startCamera} variant="outline" className="w-full">
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
                            console.log('Video metadata loaded');
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
                      <Button onClick={captureImage} className="flex-1">
                        <Camera className="w-4 h-4 mr-2" />
                        Capture Photo
                      </Button>
                      <Button onClick={stopCamera} variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      Position your face in the center and ensure good lighting
                    </p>
                  </div>
                )}

                {faceImage && (
                  <div className="space-y-4">
                    <img
                      src={faceImage}
                      alt="Captured face"
                      className="w-full rounded-lg border-2 border-green-500"
                    />
                    <Button onClick={retakeImage} variant="outline" className="w-full" disabled={loading}>
                      Retake Photo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleVerifyLogin}
              disabled={loading || !otpCode || !faceImage}
              className="w-full"
              size="lg"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </Button>

            <div className="text-center">
              <Button
                onClick={handleRequestOTP}
                variant="link"
                disabled={loading}
                className="text-sm"
              >
                Resend OTP
              </Button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};

export default MFALogin;
