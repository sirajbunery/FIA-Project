# BEOE Travel Document Validation AI Agent

AI-powered document validation system for Pakistani travelers to verify their travel documents before going to the airport. Helps prevent deportation/uploading by FIA Immigration.

## Project Structure

```
FIA-Project/
├── backend/                 # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # TypeScript types/interfaces
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── uploads/            # Temporary document storage
│   ├── logs/               # Application logs
│   └── supabase-schema.sql # Database schema
├── frontend/               # Next.js 14 + TypeScript + Tailwind
│   ├── app/               # Next.js app router
│   └── components/        # React components
└── docs/                  # Documentation
```

## Quick Start

### Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Tesseract OCR** - Required for document text extraction:
   - **Windows**: Download from [UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)
   - **macOS**: `brew install tesseract tesseract-lang`
   - **Linux**: `sudo apt-get install tesseract-ocr tesseract-ocr-urd`

### Step 1: Set Up Free Services

#### Anthropic Claude API (Required)
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an account and get your API key
3. Add to backend `.env`: `ANTHROPIC_API_KEY=your_key_here`

#### Supabase Database (Required)
1. Go to [supabase.com](https://supabase.com/)
2. Create a new project (free tier available)
3. Go to **SQL Editor** and run the contents of `backend/supabase-schema.sql`
4. Go to **Project Settings > API** and copy:
   - Project URL → `SUPABASE_URL`
   - anon public key → `SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_KEY`

#### WhatsApp Business API (Optional)
- Use [360Dialog](https://www.360dialog.com/) for WhatsApp integration
- Or use Meta's WhatsApp Business API directly

### Step 2: Configure Environment

**Backend** (`backend/.env`):
```env
# Required
ANTHROPIC_API_KEY=your_claude_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Optional
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Step 3: Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access the application:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/validate` | Upload and validate documents |
| POST | `/api/validate/base64` | Validate base64 encoded documents |
| GET | `/api/validate/status/:sessionId` | Check validation status |
| GET | `/api/requirements` | Get all supported countries |
| GET | `/api/requirements/:country` | Get country requirements |
| GET | `/api/requirements/:country/checklist` | Get document checklist |
| POST | `/api/user/register` | Register new user |
| GET | `/api/user/:phoneNumber` | Get user by phone |
| GET | `/api/user/history/:userId` | Get validation history |
| GET | `/api/whatsapp/webhook` | WhatsApp webhook verification |
| POST | `/api/whatsapp/webhook` | Handle WhatsApp messages |

## Features

### Document Validation
- Passport validation (6+ months validity check)
- Visa type and validity verification
- BEOE registration verification
- GAMCA medical certificate check
- Flight ticket validation
- Cross-document name matching

### Supported Countries
- Saudi Arabia (KSA)
- United Arab Emirates (UAE)
- Qatar
- Kuwait
- Oman
- Bahrain
- Malaysia
- United Kingdom
- United States
- Canada

### WhatsApp Bot
The WhatsApp bot allows users to:
1. Send destination country
2. Upload documents as photos
3. Receive validation results in English and Urdu

## Technology Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API (Haiku model)
- **OCR**: Tesseract
- **Messaging**: WhatsApp Business API

## Cost Estimation

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Supabase | 500MB database, 1GB storage | Free tier sufficient for MVP |
| Anthropic Claude | Pay-as-you-go | ~$0.25-0.50 per 1M tokens (Haiku) |
| Vercel | 100GB bandwidth | Frontend hosting |
| Render | 750 hours/month | Backend hosting |

**Estimated cost per validation**: PKR 5-15 (mostly Claude API)

## Development

### Running Tests
```bash
cd backend
npm test
```

### Building for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## Deployment

### Backend (Render)
1. Connect your GitHub repository
2. Select `backend` folder as root
3. Set environment variables
4. Build command: `npm install && npm run build`
5. Start command: `npm start`

### Frontend (Vercel)
1. Import from GitHub
2. Select `frontend` folder as root
3. Set `NEXT_PUBLIC_API_URL` to your Render URL
4. Deploy

## Security Notes

- Documents are automatically deleted after 30 days
- No sensitive data stored in logs
- Rate limiting enabled (100 requests per 15 minutes)
- CORS configured for frontend domain only

## Support

For issues or questions:
- GitHub Issues
- WhatsApp: +92 333 6689905
- Email: sirajbunery048@gmail.com

## License

MIT License
