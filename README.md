# 🎰 Servis Automat Klub - PWA

A complete Progressive Web App for managing slot machine repair tickets across Favbet halls, built with Croatian language interface.

![PWA](https://img.shields.io/badge/PWA-Ready-brightgreen) ![React](https://img.shields.io/badge/React-18.3.1-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue) ![Supabase](https://img.shields.io/badge/Supabase-Database-green)

## 🌟 Features

### 🏢 **Role-Based Access Control**
- **Hall Users (Dvorana):** Create tickets for their hall, view own open/history
- **Technicians (Tehničar):** Handle assigned tickets, update status, close tickets  
- **Admins:** Full oversight, assign/reassign, export data, analytics

### 📱 **Mobile-First PWA**
- **Installable:** Works as native app on mobile devices
- **Offline Capable:** IndexedDB for drafts, background sync
- **Croatian Interface:** Complete Croatian language UI
- **Bottom Navigation:** Mobile-optimized navigation (Prijave · Nove · Moje · Statistika · Profil)

### 🔄 **Enhanced Workflow**
- **5-Stage Status Flow:** `novo` → `u_tijeku` → `čeka se rezervni dio` | `čeka se porezna` → `zatvoreno`
- **Auto-Numbering:** YYYYMM#### format for unique request numbers
- **Status History:** Complete audit trail with mandatory comments
- **Employee Tracking:** Employee name field for better accountability

### 📊 **Advanced Features**
- Photo attachments for tickets (up to 10MB each)
- Dashboard analytics for each role
- CSV export functionality (admin)
- Real-time updates using Supabase realtime
- Email notifications for new requests
- Automated weekly reports (cron job)
- Push notifications for ticket assignments

## 🚀 Live Demo

**Application URL:** https://yrkq63r4vtmi.space.minimax.io

### 🔑 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@favbet.hr | admin123 |
| **Technician** | marko@favbet.hr | password123 |
| **Hall** | zagreb@favbet.hr | password123 |

## 🛠 Tech Stack

### Frontend
- **React 18.3** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for responsive design
- **React Router** for navigation
- **React Hook Form** with Zod validation
- **Radix UI** components
- **Lucide React** icons

### Backend & Database
- **Supabase** (PostgreSQL database)
- **Supabase Auth** for JWT authentication
- **Supabase Storage** for file uploads
- **Supabase Edge Functions** for API endpoints
- **Row Level Security** (RLS) policies
- **pg_cron** for automated tasks

### PWA Features
- **Service Worker** for offline functionality
- **Web App Manifest** for installation
- **Background Sync** for offline data
- **IndexedDB** for local storage

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Max-netu/repairMM.git
cd repairMM
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
Create `.env.local` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Run development server**
```bash
pnpm dev
```

5. **Build for production**
```bash
pnpm build
```

## 🏗 Architecture

### Frontend Architecture
- **Context-based authentication** with AuthContext
- **Custom hooks** for mobile detection and API calls
- **Component-based design** with reusable UI components
- **Error boundaries** for graceful error handling

### Backend Architecture
- **13 Supabase Edge Functions** for API endpoints:
  - `auth-login` - User authentication
  - `auth-refresh` - Token refresh
  - `tickets-list` - Get tickets with filtering
  - `tickets-detail` - Get ticket details
  - `tickets-create` - Create new tickets (v4 with auto-numbering)
  - `tickets-update` - Update ticket status (v4 with history tracking)
  - `tickets-assign` - Assign tickets to technicians
  - `dashboard-stats` - Analytics data for all roles
  - `send-notification` - Email notifications for new requests
  - `weekly-report` - Admin reporting (JWT protected)
  - `weekly-report-cron` - Automated weekly reports
  - `users-create` - User management
  - `users-delete` - User removal
  - `users-list` - User listing
  - `users-update` - User updates

### Security Features
- **JWT-based authentication** with 24-hour expiration
- **Row Level Security** policies for data access control
- **Custom auth header** (`x-user-token`) to avoid Supabase conflicts
- **Password hashing** for secure credential storage
- **Role-based access** with hall/technician/admin permissions

## 📊 Database Schema

### Core Tables
- **users** - User accounts with roles (admin/technician/hall)
- **clubs** - Hall information (Zagreb, Split, Rijeka)
- **machines** - Slot machine inventory per club
- **tickets** - Enhanced repair tickets with Croatian status flow
- **ticket_attachments** - Photo/file attachments
- **request_status_history** - Complete audit trail for status changes

### Database Functions
- **generate_request_number()** - Auto-generates YYYYMM#### format numbers
- **Comprehensive RLS policies** for secure data access by role

### Sample Data
- 3 Croatian halls (Favbet Arena Zagreb, Favbet Palace Split, Favbet Grand Rijeka)
- 6 sample users across all roles
- 6 slot machines
- 5 sample tickets in various Croatian states

## 📱 User Flows

### Hall User (Dvorana)
1. **Login** → View hall dashboard statistics
2. **Create Ticket** → "Nova" → 9-field form with manufacturer, machine selection, photos
3. **Monitor Status** → "Prijave" → Track ticket progress with Croatian status
4. **Real-time Updates** → Get notifications when technician works

### Technician (Tehničar)  
1. **Login** → See assigned tickets only
2. **Open Details** → View description, photos, status history
3. **Update Status** → "U tijeku" → "Čeka se rezervni dio" → "Zatvori" with mandatory comments
4. **Track Work** → Monitor completed tickets

### Admin
1. **Login** → System-wide dashboard overview
2. **Assign Tickets** → See unassigned tickets, assign to technicians
3. **Monitor Operations** → Hall breakdown, status analytics
4. **Export Data** → CSV export with filtering options
5. **Weekly Reports** → Automated Monday 9:00 reports via cron job

## 🔧 API Endpoints

### Authentication
- `POST /auth-login` - User login
- `POST /auth-refresh` - Token refresh

### Tickets (Enhanced)
- `GET /tickets-list` - Get tickets (filtered by role)
- `GET /tickets-detail` - Get specific ticket with status history
- `POST /tickets-create` - Create new ticket with auto-numbering
- `PATCH /tickets-update` - Update ticket status with history tracking
- `POST /tickets-assign` - Assign ticket (admin only)

### Notifications
- `POST /send-notification` - Email notifications for new requests

### Reporting
- `GET /weekly-report` - Admin weekly reports (JWT protected)
- `POST /weekly-report-cron` - Cron job for automated reports

### Dashboard
- `GET /dashboard-stats` - Analytics data by role

## 🌍 Localization

The application is fully localized for Croatian with:
- **Croatian interface text** throughout
- **Croatian status values:** novo, u_tijeku, čeka se rezervni dio, čeka se porezna, zatvoreno
- **Croatian city names** (Zagreb, Split, Rijeka)
- **Croatian locale formatting** (hr-HR)
- **Croatian email domains** (.hr)

## 📈 Performance

- **Mobile-optimized:** < 1.5s load time on mobile
- **PWA compliant:** Lighthouse PWA score > 90
- **Offline-first:** Service worker caching
- **Code splitting:** Optimized bundle size
- **Database optimized:** Efficient queries with RLS policies

## 🚧 Enhanced Workflow Features

### Request Management
- **9-Field Form:** employee_name, manufacturer (78 options), game_name, can_play (radio), serial_number, inventory_number, request_number (auto), comments, club_id
- **Auto-Numbering:** YYYYMM#### format with database function
- **Status History:** Mandatory comments (10+ chars) for all status changes
- **Role-based Visibility:** Hall users see only their club's requests

### Automation
- **Email Notifications:** Automatic alerts to admins for new requests
- **Weekly Reports:** Automated Monday 9:00 reports via pg_cron
- **Status Validation:** Only valid transitions allowed per Croatian workflow

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** for the excellent backend-as-a-service platform
- **Radix UI** for accessible React components
- **Tailwind CSS** for the utility-first CSS framework
- **Vite** for the lightning-fast build tool

---

**Built with ❤️ for Croatian gaming industry**

For support or questions, please open an issue in this repository.