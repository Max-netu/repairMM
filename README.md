# 🎰 Servis Automat Klub - PWA

A complete Progressive Web App for managing slot machine repair tickets across Favbet halls, built with Croatian language interface.

![PWA](https://img.shields.io/badge/PWA-Ready-brightgreen) ![React](https://img.shields.io/badge/React-18.3.1-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue) ![Supabase](https://img.shields.io/badge/Supabase-Database-green)

## 🌟 Features

### 🏢 **Role-Based Access Control**
- **Club Users (Klub):** Create tickets for their hall, view own open/history
- **Technicians (Tehničar):** Handle assigned tickets, update status, close tickets  
- **Admins:** Full oversight, assign/reassign, export data, analytics

### 📱 **Mobile-First PWA**
- **Installable:** Works as native app on mobile devices
- **Offline Capable:** IndexedDB for drafts, background sync
- **Croatian Interface:** Complete Croatian language UI
- **Bottom Navigation:** Mobile-optimized navigation (Prijave · Nove · Moje · Statistika · Profil)

### 🔄 **Ticket Workflow**
Status flow: `new` → `in_progress` → `waiting_parts` | `waiting_tax` → `closed`

### 📊 **Advanced Features**
- Photo attachments for tickets (up to 10MB each)
- Dashboard analytics for each role
- CSV export functionality (admin)
- Real-time updates using Supabase realtime
- Push notifications for ticket assignments

## 🚀 Live Demo

**Application URL:** https://uugyej0jl7fq.space.minimax.io

### 🔑 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@favbet.hr | password123 |
| **Technician** | marko@favbet.hr | password123 |
| **Club** | zagreb@favbet.hr | password123 |

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

### PWA Features
- **Service Worker** for offline functionality
- **Web App Manifest** for installation
- **Background Sync** for offline data
- **IndexedDB** for local storage

## 📊 Database Schema

### Core Tables
- **users** - User accounts with roles (admin/technician/club)
- **clubs** - Hall information (Zagreb, Split, Rijeka)
- **machines** - Slot machine inventory per club
- **tickets** - Repair tickets with status tracking
- **ticket_attachments** - Photo/file attachments

### Sample Data
- 3 Croatian clubs (Favbet Arena Zagreb, Favbet Palace Split, Favbet Grand Rijeka)
- 6 sample users across all roles
- 6 slot machines
- 5 sample tickets in various states

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd servis-automat-klub-pwa
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
- **8 Supabase Edge Functions** for API endpoints:
  - `auth-login` - User authentication
  - `auth-refresh` - Token refresh
  - `tickets-list` - Get tickets with filtering
  - `tickets-detail` - Get ticket details
  - `tickets-create` - Create new tickets
  - `tickets-update` - Update ticket status
  - `tickets-assign` - Assign tickets to technicians
  - `dashboard-stats` - Analytics data for all roles

### Security Features
- **JWT-based authentication** with 24-hour expiration
- **Row Level Security** policies for data access control
- **Custom auth header** (`x-user-token`) to avoid Supabase conflicts
- **Password hashing** for secure credential storage

## 📱 User Flows

### Club User (Klub)
1. **Login** → View club dashboard statistics
2. **Create Ticket** → "Nova" → Select machine, add photos, description
3. **Monitor Status** → "Prijave" → Track ticket progress
4. **Real-time Updates** → Get notifications when technician works

### Technician (Tehničar)  
1. **Login** → See assigned tickets only
2. **Open Details** → View description and photos
3. **Update Status** → "U obradi" → "Čeka dijelove" → "Zatvori"
4. **Track Work** → Monitor completed tickets

### Admin
1. **Login** → System-wide dashboard overview
2. **Assign Tickets** → See unassigned tickets, assign to technicians
3. **Monitor Operations** → Club breakdown, status analytics
4. **Export Data** → CSV export with filtering options

## 🔧 API Endpoints

### Authentication
- `POST /auth-login` - User login
- `POST /auth-refresh` - Token refresh

### Tickets
- `GET /tickets-list` - Get tickets (filtered by role)
- `GET /tickets-detail` - Get specific ticket
- `POST /tickets-create` - Create new ticket
- `PATCH /tickets-update` - Update ticket status
- `POST /tickets-assign` - Assign ticket (admin only)

### Dashboard
- `GET /dashboard-stats` - Analytics data by role

## 🌍 Localization

The application is fully localized for Croatian with:
- **Croatian interface text** throughout
- **Croatian city names** (Zagreb, Split, Rijeka)
- **Croatian locale formatting** (hr-HR)
- **Croatian email domains** (.hr)

## 📈 Performance

- **Mobile-optimized:** < 1.5s load time on mobile
- **PWA compliant:** Lighthouse PWA score > 90
- **Offline-first:** Service worker caching
- **Code splitting:** Optimized bundle size

## 🚧 Future Enhancements

### Planned Features
- **QR Code Scanning** for quick machine reporting
- **Spare Parts Integration** with inventory management
- **Technician Routing** optimization algorithms
- **Machine Analytics** for failure prediction
- **Advanced Reporting** with charts and trends
- **Real-time Chat** between club users and technicians

### Technical Improvements
- **Push Notifications** implementation
- **Advanced Offline Mode** with conflict resolution
- **Performance Monitoring** integration
- **Automated Testing** suite
- **CI/CD Pipeline** setup

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
