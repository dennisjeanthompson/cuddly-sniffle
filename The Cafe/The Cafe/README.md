# The Café - Employee Management System

A modern, full-stack employee management system for café businesses. Features time tracking, shift scheduling, payroll management, and role-based access for employees and managers.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/dennisjeanthompson/cuddly-sniffle.git

# Navigate to the project folder
cd "cuddly-sniffle/The Cafe/The Cafe"

# Install dependencies
npm install
```

### Running the App

```bash
# Start the development servers
npm run dev
```

This starts two servers:
- **Desktop (Manager/Admin)**: http://localhost:5000
- **Mobile (Employee)**: http://localhost:5001

### Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Manager | manager | manager123 |
| Employee | employee1 | password123 |

## 📱 Features

### For Employees (Mobile - Port 5001)
- View schedule and upcoming shifts
- Clock in/out
- Request time off
- Trade shifts with coworkers
- View payslips

### For Managers/Admins (Desktop - Port 5000)
- Manage employee schedules (Week/Month view)
- Process payroll with 2-week or monthly periods
- Approve time-off requests
- View reports and analytics
- Manage employees and branches

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both desktop and mobile servers |
| `npm run dev:desktop` | Start only desktop server (port 5000) |
| `npm run dev:mobile` | Start only mobile server (port 5001) |
| `npm run build` | Build for production |
| `npm run test` | Run tests |
| `npm start` | Start production server |

## 🗄️ Database

The app uses PostgreSQL (Neon) for both development and production. The database is automatically initialized with all required tables and seeded with sample data on first run.

Set the `DATABASE_URL` environment variable to connect to your PostgreSQL database:
```bash
export DATABASE_URL="postgresql://user:password@host/database"
npm run dev
```

## 📁 Project Structure

```
The Cafe/
├── client/           # React frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Page components
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities
├── server/           # Express backend
│   ├── routes/       # API route handlers
│   └── services/     # Business logic
├── shared/           # Shared types and schemas
└── package.json
```

## 🔧 Tech Stack

- **Frontend**: React, TypeScript, Vite, Material-UI, TailwindCSS
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Neon (Drizzle ORM)
- **State**: TanStack Query

## 📄 License

MIT
