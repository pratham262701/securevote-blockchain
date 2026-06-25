import React, { useState, useEffect, useRef } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Vote, CheckCircle, XCircle, Clock, Shield, AlertTriangle, Camera, RefreshCw, Mic, Square } from 'lucide-react';
import CryptoJS from 'crypto-js';
import { useTranslation } from 'react-i18next';
import { detectSign, recognizeVoice } from '../api/backend';

const VoterPanel = ({ web3, account, contract, votingPeriod }) => {
  const { t } = useTranslation();
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [voterStatus, setVoterStatus] = useState({
    isRegistered: false,
    hasVoted: false
  });
  const [voteReceipt, setVoteReceipt] = useState(null);

  // Sign Language State
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [detectedSign, setDetectedSign] = useState(null);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [detecting, setDetecting] = useState(false);

  // Voice Voting State
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [recognizedCandidate, setRecognizedCandidate] = useState(null);
  const [voiceConfidence, setVoiceConfidence] = useState(0);
  const [recognizing, setRecognizing] = useState(false);

  // Camera Handlers
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please allow permissions.");
    }
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      // Set canvas dimensions to match video
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const imageDataUrl = canvasRef.current.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);
      stopCamera();
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setDetectedSign(null);
    setDetectionConfidence(0);
    startCamera();
  };

  const handleDetectSign = async () => {
    if (!capturedImage) return;

    setDetecting(true);
    setError('');
    try {
      // Convert base64 to blob
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], "sign_capture.jpg", { type: "image/jpeg" });

      const result = await detectSign(file);

      if (result.success) {
        setDetectedSign(result.detected_sign);
        setDetectionConfidence(result.confidence);

        // Auto-select candidate if confidence is high
        if (result.confidence > 0.5) {
           setSelectedCandidate(String(result.detected_sign));
        }
      } else {
        setError(result.error || 'Detection failed');
      }
    } catch (err) {
      console.error("Detection error:", err);
      setError('Failed to detect sign');
    }
    setDetecting(false);
  };

  // Voice Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try to use WAV format if supported, otherwise use webm/ogg
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        options = { mimeType: 'audio/wav' };
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
      }

      console.log('Recording with format:', options.mimeType || 'default');

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use the actual mimeType from the recorder
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        setAudioBlob(audioBlob);
        console.log('Audio blob created:', audioBlob.type, audioBlob.size, 'bytes');
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError('');
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const resetVoiceRecording = () => {
    setAudioBlob(null);
    setRecognizedText('');
    setRecognizedCandidate(null);
    setVoiceConfidence(0);
  };

  const handleRecognizeVoice = async () => {
    if (!audioBlob) return;

    setRecognizing(true);
    setError('');
    try {
      // Use the actual blob type and determine file extension
      const mimeType = audioBlob.type;
      let extension = 'webm';
      if (mimeType.includes('wav')) extension = 'wav';
      else if (mimeType.includes('ogg')) extension = 'ogg';
      else if (mimeType.includes('mp3')) extension = 'mp3';

      console.log('Sending audio file:', mimeType, extension);

      const audioFile = new File([audioBlob], `voice_recording.${extension}`, { type: mimeType });
      const result = await recognizeVoice(audioFile);

      if (result.success) {
        setRecognizedText(result.spoken_text);
        setRecognizedCandidate(result.matched_candidate);
        setVoiceConfidence(result.overall_confidence);

        // Auto-select candidate if confidence is high
        if (result.overall_confidence > 0.6) {
          setSelectedCandidate(String(result.matched_candidate.id));
        }
      } else {
        setError(result.error || 'Voice recognition failed');
      }
    } catch (err) {
      console.error("Voice recognition error:", err);
      setError('Failed to recognize voice');
    }
    setRecognizing(false);
  };

  useEffect(() => {
    if (contract && account) {
      loadCandidates();
      checkVoterStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, account]);

  const loadCandidates = async () => {
    try {
      const rawCount = await contract.methods.candidateCount().call();
      const candidateCount = parseInt(rawCount.toString(), 10);
      const candidateList = [];

      for (let i = 1; i <= candidateCount; i++) {
        const candidate = await contract.methods.candidates(i).call();
        candidateList.push({
          id: candidate.id.toString(),
          name: candidate.name,
          votes: candidate.votes.toString()
        });
      }

      setCandidates(candidateList);
    } catch (err) {
      console.error('Error loading candidates:', err);
      setError('Failed to load candidates');
    }
  };

  const checkVoterStatus = async () => {
    try {
      const isRegistered = await contract.methods.registered(account).call();
      const hasVoted = await contract.methods.voted(account).call();

      setVoterStatus({
        isRegistered: !!isRegistered,
        hasVoted: !!hasVoted
      });
    } catch (err) {
      console.error('Error checking voter status:', err);
    }
  };

  const encryptVote = (candidateId, voterAddress) => {
    const voteData = {
      candidateId: String(candidateId),
      voter: voterAddress,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2, 15)
    };

    const voteString = JSON.stringify(voteData);
    const secretKey = import.meta.env.VITE_ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    const encrypted = CryptoJS.AES.encrypt(voteString, secretKey).toString();

    return {
      encryptedVote: encrypted,
      voteData
    };
  };

  const generateVoteHash = (encryptedVote) => {
    return CryptoJS.SHA256(encryptedVote).toString();
  };

  const castVote = async () => {
    if (!selectedCandidate) {
      setError('Please select a candidate');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const candidateIdNumber = Number(selectedCandidate);
      if (Number.isNaN(candidateIdNumber)) throw new Error('Invalid candidate id');

      const { encryptedVote, voteData } = encryptVote(candidateIdNumber, account);
      const voteHash = generateVoteHash(encryptedVote);
      const voteHashBytes32 = '0x' + voteHash;

      const receipt = await contract.methods
        .castVote(candidateIdNumber, voteHashBytes32)
        .send({
          from: account,
          gas: '300000'
        });

      const voteRecord = {
        transactionHash: receipt.transactionHash || '',
        blockNumber: receipt.blockNumber != null ? String(receipt.blockNumber) : '',
        candidateId: String(candidateIdNumber),
        encryptedVote: encryptedVote,
        voteHash: voteHash,
        timestamp: voteData.timestamp,
        voter: account
      };

      localStorage.setItem(`vote_${account}`, JSON.stringify(voteRecord));

      setVoteReceipt(voteRecord);
      setSuccess('Vote cast successfully!');

      // update local UI
      await checkVoterStatus();
      await loadCandidates();

      // notify other components in this browser session
      window.dispatchEvent(new CustomEvent('evote:vote_cast', { detail: voteRecord }));
    } catch (err) {
      console.error('Error casting vote:', err);
      setError('Failed to cast vote: ' + (err.message || 'Unknown error'));
    }

    setLoading(false);
  };

  const getVotingStatusMessage = () => {
    if (!votingPeriod?.started) {
      return { message: t('voter.votingNotStarted'), variant: "secondary", icon: Clock };
    } else if (votingPeriod?.ended) {
      return { message: t('voter.votingEnded'), variant: "destructive", icon: XCircle };
    } else {
      return { message: t('voter.votingActive'), variant: "default", icon: CheckCircle };
    }
  };

  const statusInfo = getVotingStatusMessage();

  return (
    <div className="space-y-6">
      {/* Voter Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            {t('voter.voterStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <Badge variant={voterStatus.isRegistered ? "default" : "secondary"}>
                {voterStatus.isRegistered ? t('voter.registered') : t('voter.notRegistered')}
              </Badge>
              <div className="text-sm text-gray-600 mt-1">{t('voter.registrationStatus')}</div>
            </div>
            <div className="text-center">
              <Badge variant={voterStatus.hasVoted ? "destructive" : "default"}>
                {voterStatus.hasVoted ? t('voter.alreadyVoted') : t('voter.canVote')}
              </Badge>
              <div className="text-sm text-gray-600 mt-1">{t('voter.votingStatus')}</div>
            </div>
            <div className="text-center">
              <Badge variant={statusInfo.variant} className="flex items-center justify-center">
                <statusInfo.icon className="w-3 h-3 mr-1" />
                {votingPeriod?.started && !votingPeriod?.ended ? t('voter.active') :
                  votingPeriod?.ended ? t('voter.ended') : t('voter.pending')}
              </Badge>
              <div className="text-sm text-gray-600 mt-1">{t('voter.electionStatus')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Message */}
      <Alert>
        <statusInfo.icon className="h-4 w-4" />
        <AlertDescription>{statusInfo.message}</AlertDescription>
      </Alert>

      {/* Alerts */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Registration Warning */}
      {!voterStatus.isRegistered && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            {t('voter.notRegisteredWarning')}
          </AlertDescription>
        </Alert>
      )}

      {/* Voting Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Vote className="w-5 h-5 mr-2" />
            {t('voter.castYourVote')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('voter.noCandidates')}
            </div>
          ) : voterStatus.hasVoted ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                {t('voter.voteSuccessfullyCast')}
              </h3>
              <p className="text-gray-600">
                {t('voter.thankYou')}
              </p>
            </div>
          ) : (
            <Tabs defaultValue="regular" onValueChange={(val) => {
                if (val === 'sign' && !capturedImage) startCamera();
                else if (val === 'regular') stopCamera();
            }}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="regular">{t('voting.regularVote')}</TabsTrigger>
                <TabsTrigger value="sign">{t('voting.voteWithSign')}</TabsTrigger>
                <TabsTrigger value="voice">Voice Vote</TabsTrigger>
              </TabsList>

              <TabsContent value="regular">
                <div className="space-y-6">
                  <RadioGroup value={selectedCandidate} onValueChange={setSelectedCandidate}>
                    <div className="space-y-3">
                      {candidates.map((candidate) => (
                        <div key={candidate.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                          <RadioGroupItem value={candidate.id} id={`candidate-${candidate.id}`} />
                          <Label
                            htmlFor={`candidate-${candidate.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium">{candidate.name}</div>
                            <div className="text-sm text-gray-600">{t('voter.candidateId')}: {candidate.id}</div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>

              <TabsContent value="sign">
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      {t('signVoting.howToVote')}
                      <ul className="list-disc ml-4 mt-2">
                        <li>{t('signVoting.step1')}</li>
                        <li>{t('signVoting.step2')}</li>
                        <li>{t('signVoting.step3')}</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription>
                      <p className="font-semibold text-blue-800 mb-2">Sign Language Guide:</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">☝️</span>
                          <span><strong>1️⃣ Candidate 1:</strong> One finger up</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">✌️</span>
                          <span><strong>2️⃣ Candidate 2:</strong> Two fingers (Peace sign)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">🤟</span>
                          <span><strong>3️⃣ Candidate 3:</strong> Three fingers up</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">🖖</span>
                          <span><strong>4️⃣ Candidate 4:</strong> Four fingers up</span>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden">
                       {!capturedImage ? (
                         <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                       ) : (
                         <img src={capturedImage} alt="Captured Sign" className="w-full h-full object-cover" />
                       )}
                       <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <div className="flex gap-4">
                      {!capturedImage ? (
                        <Button onClick={captureImage}>
                          <Camera className="mr-2 h-4 w-4" /> Capture
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={resetCapture}>
                          <RefreshCw className="mr-2 h-4 w-4" /> Retake
                        </Button>
                      )}
                      
                      <Button 
                        onClick={handleDetectSign} 
                        disabled={!capturedImage || detecting}
                      >
                        {detecting ? t('signVoting.detecting') : t('signVoting.detectSign')}
                      </Button>
                    </div>

                    {detectedSign && (
                       <Alert className="bg-green-50 border-green-200">
                         <AlertDescription>
                           <p className="font-semibold text-green-800">
                             {t('signVoting.detectedSign')}: {detectedSign} ({(detectionConfidence * 100).toFixed(1)}%)
                           </p>
                           <p className="text-sm text-green-600 mt-1">
                             Selected Candidate ID: {detectedSign}
                           </p>
                         </AlertDescription>
                       </Alert>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="voice">
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      How to vote with voice:
                      <ul className="list-disc ml-4 mt-2">
                        <li>Click the microphone button to start recording</li>
                        <li>Clearly speak the candidate&apos;s name</li>
                        <li>Click stop when done, then click &quot;Recognize&quot; to process</li>
                        <li>Confirm the detected candidate and cast your vote</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-full max-w-md p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="flex flex-col items-center space-y-4">
                        <div className={`rounded-full p-8 ${isRecording ? 'bg-red-100' : 'bg-blue-100'}`}>
                          {isRecording ? (
                            <Mic className="w-12 h-12 text-red-600 animate-pulse" />
                          ) : (
                            <Mic className="w-12 h-12 text-blue-600" />
                          )}
                        </div>

                        {isRecording && (
                          <p className="text-red-600 font-semibold animate-pulse">Recording...</p>
                        )}

                        {audioBlob && !isRecording && (
                          <p className="text-green-600 font-semibold">Audio recorded successfully!</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      {!isRecording && !audioBlob && (
                        <Button onClick={startRecording}>
                          <Mic className="mr-2 h-4 w-4" /> Start Recording
                        </Button>
                      )}

                      {isRecording && (
                        <Button variant="destructive" onClick={stopRecording}>
                          <Square className="mr-2 h-4 w-4" /> Stop Recording
                        </Button>
                      )}

                      {audioBlob && !isRecording && (
                        <>
                          <Button variant="outline" onClick={resetVoiceRecording}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Re-record
                          </Button>
                          <Button onClick={handleRecognizeVoice} disabled={recognizing}>
                            {recognizing ? 'Recognizing...' : 'Recognize Voice'}
                          </Button>
                        </>
                      )}
                    </div>

                    {recognizedCandidate && (
                      <Alert className="bg-green-50 border-green-200 w-full">
                        <AlertDescription>
                          <p className="font-semibold text-green-800">
                            Recognized: &quot;{recognizedText}&quot;
                          </p>
                          <p className="text-sm text-green-600 mt-1">
                            Matched Candidate: {recognizedCandidate.name} (Confidence: {(voiceConfidence * 100).toFixed(1)}%)
                          </p>
                          <p className="text-sm text-green-600">
                            Selected Candidate ID: {recognizedCandidate.id}
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </TabsContent>

              <div className="mt-6">
                <Button
                  onClick={castVote}
                  disabled={
                    loading ||
                    !selectedCandidate ||
                    !voterStatus.isRegistered ||
                    voterStatus.hasVoted ||
                    !votingPeriod?.started ||
                    votingPeriod?.ended
                  }
                  className="w-full"
                  size="lg"
                >
                  {loading ? t('voting.castingVote') : t('voting.castVote')}
                </Button>

                {/* Voting Instructions */}
                <div className="text-sm text-gray-600 space-y-1 mt-4">
                  <p>• {t('voting.instructions.encrypted')}</p>
                  <p>• {t('voting.instructions.blockchain')}</p>
                  <p>• {t('voting.instructions.onceOnly')}</p>
                  <p>• {t('voting.instructions.noChange')}</p>
                </div>
              </div>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Vote Receipt */}
      {voteReceipt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              {t('voteReceipt.title')}
            </CardTitle>
            <CardContent>
              <div className="space-y-3 font-mono text-sm">
                <div>
                  <span className="font-semibold">{t('voteReceipt.transactionHash')}:</span>
                  <br />
                  <span className="text-blue-600 break-all">{voteReceipt.transactionHash}</span>
                </div>
                <div>
                  <span className="font-semibold">{t('voteReceipt.blockNumber')}:</span>
                  <br />
                  <span>{voteReceipt.blockNumber}</span>
                </div>
                <div>
                  <span className="font-semibold">{t('voteReceipt.voteHash')}:</span>
                  <br />
                  <span className="text-green-600 break-all">{voteReceipt.voteHash}</span>
                </div>
                <div>
                  <span className="font-semibold">{t('voteReceipt.timestamp')}:</span>
                  <br />
                  <span>{new Date(voteReceipt.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export default VoterPanel;
