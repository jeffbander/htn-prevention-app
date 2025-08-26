# HTN Prevention Program for First Responders

A comprehensive web application for managing hypertension prevention programs specifically designed for first responders (Firefighters, Police, and EMS personnel).

## 🚀 Features

### Core Functionality
- **Member Management**: Register and manage first responder participants
- **Blood Pressure Monitoring**: Record and track BP readings with automatic HTN status calculation
- **Communication Tracking**: Log encounters and follow-up sessions
- **Medical History**: Maintain comprehensive health records
- **Analytics Dashboard**: Real-time insights and program metrics

### Key Capabilities
- **Automated HTN Classification**: Follows AHA guidelines (Normal, Elevated, Stage 1, Stage 2, Crisis)
- **Risk Assessment**: Automatic categorization and priority alerts
- **Engagement Tracking**: Monitor participation and follow-up compliance
- **Union-Based Analytics**: Separate insights for Firefighters, Police, and EMS
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router DOM
- **State Management**: TanStack Query (React Query)
- **UI Components**: Shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **API Design**: RESTful

### Database Schema
- **Members**: First responder information and demographics
- **Blood Pressure Readings**: BP measurements with HTN status
- **Encounters**: Communication and follow-up sessions
- **Medical History**: Health conditions and notes

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or pnpm

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/jeffbander/htn-prevention-app.git
cd htn-prevention-app
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
pnpm install
```

### 3. Environment Setup

#### Server Environment
```bash
cd server
cp .env.example .env
```

Edit `.env` with your database configuration:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/htn_prevention
PORT=3001
NODE_ENV=development
SESSION_SECRET=your-secret-key-here
```

#### Client Environment
```bash
cd client
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:3001
```

### 4. Database Setup
```bash
cd server
npm run db:push
```

### 5. Start Development Servers

#### Option 1: Start Both Servers (Recommended)
```bash
# From project root
npm run dev
```

#### Option 2: Start Servers Separately
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
pnpm run dev
```

### 6. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## 📊 API Endpoints

### Members
- `GET /api/members` - List all members
- `GET /api/members/:id` - Get specific member
- `POST /api/members` - Create new member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

### Blood Pressure
- `GET /api/blood-pressure-readings` - List all readings
- `GET /api/blood-pressure-readings/member/:memberId` - Get member's readings
- `POST /api/blood-pressure-readings` - Create new reading
- `PUT /api/blood-pressure-readings/:id` - Update reading
- `DELETE /api/blood-pressure-readings/:id` - Delete reading

### Encounters
- `GET /api/encounters` - List all encounters
- `GET /api/encounters/member/:memberId` - Get member's encounters
- `POST /api/encounters` - Create new encounter
- `PUT /api/encounters/:id` - Update encounter
- `DELETE /api/encounters/:id` - Delete encounter

### Analytics
- `GET /api/analytics` - Get overview analytics
- `GET /api/analytics/members` - Member-specific analytics
- `GET /api/analytics/clinical` - Clinical outcomes
- `GET /api/analytics/engagement` - Engagement metrics
- `GET /api/analytics/equity` - Equity metrics
- `GET /api/analytics/impact` - Program impact

## 🏥 HTN Classification

The application automatically calculates hypertension status based on AHA guidelines:

| Category | Systolic (mmHg) | Diastolic (mmHg) |
|----------|----------------|------------------|
| Normal | < 120 | and < 80 |
| Elevated | 120-129 | and < 80 |
| Stage 1 | 130-139 | or 80-89 |
| Stage 2 | ≥ 140 | or ≥ 90 |
| Crisis | ≥ 180 | or ≥ 120 |

## 📈 Business Rules

### Member Management
- Employee ID must be unique
- Members cannot be deleted if they have associated readings/encounters
- Age calculated dynamically from date of birth
- Union affiliation required

### Blood Pressure
- Systolic: 70-300 mmHg
- Diastolic: 40-200 mmHg
- Systolic must be greater than diastolic
- HTN status automatically calculated
- Readings cannot be backdated more than 30 days

### Communication
- Session numbers sequential per member
- Completed encounters cannot be edited
- Priority based on HTN status
- Crisis status members appear at top of call lists

## 🔧 Development

### Database Operations
```bash
# Push schema changes
npm run db:push

# Open database studio
npm run db:studio

# Generate migrations
npm run db:generate
```

### Build for Production
```bash
# Build frontend
cd client
pnpm run build

# Build backend
cd server
npm run build
```

## 🚀 Deployment

### Environment Variables for Production
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Set to "production"
- `SESSION_SECRET`: Strong secret key
- `PORT`: Server port (default: 3001)

### Recommended Deployment Platforms
- **Backend**: Railway, Render, or Heroku
- **Frontend**: Vercel, Netlify, or static hosting
- **Database**: Neon, Supabase, or managed PostgreSQL

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or support, please open an issue on GitHub.

---

**Built for First Responders, by First Responders** 🚒🚔🚑

