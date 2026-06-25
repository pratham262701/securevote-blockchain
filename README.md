# SecureVote — Blockchain E-Voting System

A decentralized, tamper-resistant voting platform built on an Ethereum smart contract, with a Flask REST API and a React frontend. Voters are verified through **multimodal authentication** — wallet signature, OTP, face recognition, and Aadhaar — and can cast votes through accessible channels including **sign-language** and **voice** recognition. Every vote is recorded on-chain as a hashed, anonymized entry so results are auditable but ballots stay private.

> **Academic / demonstration project.** It includes a defensive *attack-simulation* suite that shows how the system resists common attacks (SQL injection, brute force, unauthorized access). Use it only against your own local instance.

---

## Features

- **On-chain voting** — votes are cast against a Solidity `Voting` contract; the contract enforces one-vote-per-registered-address and a fixed voting window, and stores a SHA-256 hash of each encrypted vote.
- **Multi-factor voter authentication** — MetaMask wallet + email OTP + face recognition, with optional Aadhaar verification.
- **Accessible voting modes** — cast a ballot via **sign language** (hand-landmark recognition with a trained Random Forest model) or **voice** recognition, in addition to the standard flow.
- **Admin dashboard** — manage candidates, view voter statistics, audit logs, and security alerts; lock/unlock accounts.
- **Encrypted ballots** — vote data is encrypted client- and server-side; only a hash goes on-chain.
- **Internationalization** — English and Tamil (`en`, `ta`) out of the box via i18next.
- **Security hardening** — rate limiting, login-attempt lockouts, audit logging, and input validation, demonstrated by the included attack simulator.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contract | Solidity `^0.8.17`, Truffle, Ganache |
| Backend | Python, Flask 3, Flask-SQLAlchemy, Flask-Bcrypt, PyJWT, cryptography |
| Biometrics / ML | OpenCV, `face-recognition`, scikit-learn (sign-language RF model), NumPy |
| Frontend | React 19, Vite 7, Tailwind CSS 4, Radix UI, ethers.js / web3.js, axios, i18next |
| Database | SQLite (dev) / PostgreSQL (via `psycopg2`, prod) |

---

## Project Structure

```
.
├── blockchain/            # Truffle project — Solidity contract, migrations, tests
│   ├── contracts/Voting.sol
│   ├── migrations/
│   └── truffle-config.js
├── backend/               # Flask REST API
│   ├── app.py             # App factory + entry point
│   ├── config.py          # Configuration (reads from .env)
│   ├── models/            # SQLAlchemy models (voter, voting)
│   ├── routes/            # auth, admin, sign, voice, blockchain-sync blueprints
│   ├── utils/             # encryption, face, OTP, blockchain helpers
│   ├── static/            # uploaded face/Aadhaar/sign images (gitignored)
│   └── requirements.txt
├── frontend/              # React + Vite app
│   └── src/
│       ├── components/    # AuthFlow, MFALogin, VoterPanel, AdminPanel, ResultsPanel, …
│       ├── api/  lib/  utils/  abi/
│       └── i18n/locales/  # en.json, ta.json
└── attack_demo/           # Defensive attack-simulation scripts (educational)
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Truffle** (`npm i -g truffle`) and **Ganache** (GUI or CLI) for a local Ethereum chain
- **MetaMask** browser extension
- System libraries for `face-recognition` (dlib/CMake) — see that package's install notes

---

## Setup

### 1. Smart contract

```bash
cd blockchain
npm install
# Start Ganache on 127.0.0.1:8545, then:
truffle compile
truffle migrate --reset
```

Copy the deployed contract address into `frontend/.env` (`REACT_APP_CONTRACT_ADDRESS`).

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill in the values (see Configuration)
python init_db_simple.py    # create tables + seed
python app.py               # serves on http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # set contract address + API URL
npm run dev                 # serves on http://localhost:5173
```

---

## Configuration

Backend (`backend/.env`) — never commit real values:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Flask session/signing secret |
| `JWT_SECRET` | Secret for signing JWTs |
| `ENCRYPTION_KEY` | Key used to encrypt vote/ballot data |
| `DATABASE_URL` | SQLite path or PostgreSQL connection string |
| `ADMIN_EMAIL` / `ADMIN_WALLET` | Admin identity / admin MetaMask address |
| `OTP_EXPIRY_MINUTES`, `MAX_LOGIN_ATTEMPTS` | Auth policy |
| `SMTP_HOST/PORT/USER/PASSWORD` | Email for OTP delivery |
| `FACE_RECOGNITION_TOLERANCE` | Face-match strictness |
| `DEV_MODE` | Skip Aadhaar checksum validation when `True` |

Frontend (`frontend/.env`): `REACT_APP_CONTRACT_ADDRESS`, `REACT_APP_NETWORK_ID`, `REACT_APP_API_URL` / `VITE_BACKEND_URL`, `VITE_ENCRYPTION_KEY`.

---

## API Overview

Base URL: `http://localhost:8000`

**Auth** (`/api/auth`)
- `POST /register` — register a new voter
- `POST /register-face` — enroll face biometrics
- `POST /login/request-otp` — request a login OTP
- `POST /login/verify` — verify OTP + face
- `GET /voter/<wallet>` — voter info

**Admin** (`/api/admin`)
- `GET /voters`, `GET /voters/stats`, `GET /audit-logs`, `GET /alerts`
- `POST /alerts/<id>/resolve`, `POST /voters/<id>/unlock`, `DELETE /voters/<id>`

**Sign-language voting** (`/api/sign`)
- `GET /candidates`, `GET /candidates/<sign>`, `POST /detect`, `POST /vote`, `GET /stats`

**Voice voting** (`/api/voice`)
- `POST /recognize`, `POST /vote`, `GET /candidates`

**Blockchain sync** (`/api/sync`) · **Health** (`GET /health`)

---

## Smart Contract

`Voting.sol` exposes admin-gated candidate management (`addCandidate`, `updateCandidateName`), voter registration (`registerVoter`), and `castVote(candidateId, voteHash)`, which is guarded by `duringVoting` and prevents double-voting. Vote tallies and a per-vote hash are emitted as events for auditability.

---

## Security Notes

This is a learning project and **not** certified for real elections. Before doing anything beyond local experimentation:

- Generate fresh, strong secrets for every `.env` value (the shipped examples are placeholders).
- Never commit `.env`, the SQLite database, or the `backend/static/` image folders — they may contain personal/biometric data. These are excluded by `.gitignore`.
- Replace the dev SQLite DB with PostgreSQL and serve behind HTTPS.
- Review the `attack_demo/` suite; run it only against your own instance.

---

## License

MIT — see [LICENSE](LICENSE).
