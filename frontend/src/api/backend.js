import axios from 'axios'

const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth endpoints
export async function registerVoter(walletAddress, aadhaarNumber, voterID, name, email, phone, state = null, city = null) {
  const res = await api.post('/api/auth/register', {
    wallet_address: walletAddress,
    aadhaar_number: aadhaarNumber,
    voter_id: voterID,
    name,
    email,
    phone,
    state,
    city,
  })
  return res.data
}

export async function registerFace(walletAddress, faceImageBase64, aadhaarImageBase64 = null) {
  const res = await api.post('/api/auth/register-face', {
    wallet_address: walletAddress,
    face_image: faceImageBase64,
    aadhaar_image: aadhaarImageBase64,
  })
  return res.data
}

export async function verifyAadhaarPhoto(walletAddress, aadhaarImageBase64, selfieBase64) {
  const res = await api.post('/api/auth/verify-aadhaar-photo', {
    wallet_address: walletAddress,
    aadhaar_image: aadhaarImageBase64,
    selfie_image: selfieBase64,
  })
  return res.data
}

export async function requestOTP(walletAddress, otpType = 'email') {
  const res = await api.post('/api/auth/login/request-otp', {
    wallet_address: walletAddress,
    otp_type: otpType,
  })
  return res.data
}

export async function verifyLogin(walletAddress, otpCode, faceImageBase64, aadhaarImageBase64) {
  const res = await api.post('/api/auth/login/verify', {
    wallet_address: walletAddress,
    otp_code: otpCode,
    face_image: faceImageBase64,
    aadhaar_image: aadhaarImageBase64,
  })
  return res.data
}

export async function getVoterInfo(walletAddress) {
  const res = await api.get(`/api/auth/voter/${walletAddress}`)
  return res.data
}

// Admin endpoints
export async function getAllVoters(page = 1, perPage = 50) {
  const res = await api.get('/api/admin/voters', {
    params: { page, per_page: perPage },
  })
  return res.data
}

export async function getVoterStats() {
  const res = await api.get('/api/admin/voters/stats')
  return res.data
}

export async function getAuditLogs(page = 1, perPage = 100, action = null, status = null) {
  const res = await api.get('/api/admin/audit-logs', {
    params: { page, per_page: perPage, action, status },
  })
  return res.data
}

export async function getAttackAlerts(page = 1, perPage = 50, severity = null) {
  const res = await api.get('/api/admin/alerts', {
    params: { page, per_page: perPage, severity },
  })
  return res.data
}

export async function resolveAlert(alertId) {
  const res = await api.post(`/api/admin/alerts/${alertId}/resolve`)
  return res.data
}

export async function unlockVoterAccount(voterId) {
  const res = await api.post(`/api/admin/voters/${voterId}/unlock`)
  return res.data
}

export async function getAllVotes(page = 1, perPage = 50) {
  const res = await api.get('/api/admin/votes', {
    params: { page, per_page: perPage },
  })
  return res.data
}

export async function getVoteStats() {
  const res = await api.get('/api/admin/votes/stats')
  return res.data
}

// Sign Language endpoints
export async function detectSign(imageFile) {
  const formData = new FormData()
  formData.append('image', imageFile)

  const res = await api.post('/api/sign/detect', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}

// Voice Voting endpoints
export async function recognizeVoice(audioFile) {
  const formData = new FormData()
  formData.append('audio', audioFile)

  const res = await api.post('/api/voice/recognize', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}

export async function castVoteWithVoice(audioFile, walletAddress) {
  const formData = new FormData()
  formData.append('audio', audioFile)
  formData.append('wallet_address', walletAddress)

  const res = await api.post('/api/voice/vote', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}

// Health check
export async function healthCheck() {
  const res = await api.get('/health')
  return res.data
}

export default api