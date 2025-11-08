# Servis Automat Klub PWA - Project Documentation

## Project Overview
A comprehensive Progressive Web App (PWA) for managing slot machine repair tickets with role-based access for clubs, technicians, and administrators.

## Deployed Application
**URL:** https://zzn0bws0hplx.space.minimax.io

## Test Credentials
- **Admin:** admin@favbet.rs / password123
- **Technician:** marko@favbet.rs / password123
- **Club (Beograd):** beograd@favbet.rs / password123
- **Club (Novi Sad):** novisad@favbet.rs / password123
- **Club (Nis):** nis@favbet.rs / password123

## Technical Stack

### Backend (Supabase)
- **Database:** PostgreSQL with 5 tables (clubs, users, machines, tickets, ticket_attachments)
- **Authentication:** Custom JWT-based authentication via Edge Functions
- **Storage:** Supabase Storage bucket for ticket attachments (10MB limit)
- **API:** 8 Edge Functions for all operations

### Frontend (React PWA)
- **Framework:** React 18.3 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM
- **State:** React Context API + LocalForage for offline storage
- **Icons:** Lucide React
- **PWA:** Service Worker + Web App Manifest

## Database Schema

### clubs
- id, name, city, address, created_at

### users
- id, name, email, password_hash (SHA-256), role (admin/technician/club), club_id, created_at, updated_at

### machines
- id, club_id, number, model, created_at

### tickets
- id, club_id, machine_id, title, description, status, priority, assigned_technician_id, created_by_user_id, closed_at, created_at, updated_at

### ticket_attachments
- id, ticket_id, file_url, filename, uploaded_at

## Edge Functions

1. **auth-login** - User authentication with JWT token generation
2. **auth-refresh** - JWT token refresh
3. **tickets-create** - Create new ticket with file uploads
4. **tickets-list** - List tickets filtered by user role
5. **tickets-detail** - Get detailed ticket view with attachments
6. **tickets-update** - Update ticket status
7. **tickets-assign** - Assign ticket to technician (admin only)
8. **dashboard-stats** - Get dashboard statistics by role

All functions use custom `x-user-token` header for authentication.

## Features Implemented

### User Roles & Permissions
- **Club Users:** Create tickets for their hall, view own tickets
- **Technicians:** View assigned tickets, update status
- **Admins:** Full visibility, assign tickets, export data

### Ticket Lifecycle
Status flow: `new` → `in_progress` → `waiting_parts` | `waiting_tax` → `closed`

### PWA Features
- Offline-capable with Service Worker
- Installable app (manifest.json)
- App icons (192x192 and 512x512)
- Mobile-first responsive design
- Bottom navigation for easy mobile access

### Mobile-First UI (Croatian Language)
- Bottom Navigation: Početna · Prijave · Nova (club only) · Profil
- Status badges with color coding
- Priority indicators
- Photo upload capability
- Real-time status updates

## Sample Data
- 3 clubs (Beograd, Novi Sad, Nis)
- 6 users (1 admin, 2 technicians, 3 club users)
- 6 machines across clubs
- 5 sample tickets with various statuses

## Security Features
- JWT token-based authentication with 24-hour expiration
- Row Level Security (RLS) policies on all tables
- Password hashing (SHA-256)
- Role-based API access control
- CORS properly configured

## How to Use

### As Club User:
1. Login with club credentials
2. View Dashboard statistics for your club
3. Click "Nova" to create new ticket
4. Select machine, add description, attach photos
5. View ticket status updates from technicians

### As Technician:
1. Login with technician credentials
2. View assigned tickets on Dashboard
3. Navigate to "Prijave" to see ticket list
4. Click ticket to view details
5. Update status: "U obradi" → "Čeka dijelove"/"Čeka poreznu" → "Zatvori"

### As Admin:
1. Login with admin credentials
2. View complete system statistics
3. See breakdown by club
4. Assign unassigned tickets to technicians
5. Update any ticket status

## Technical Implementation Notes

### Custom Authentication
- Used custom JWT instead of Supabase Auth for flexibility
- Token stored in IndexedDB via LocalForage
- Custom header `x-user-token` to avoid conflicts with Supabase anon key

### File Uploads
- Images converted to base64 in frontend
- Uploaded via Edge Function to Supabase Storage
- Public URLs stored in database
- Supports multiple attachments per ticket

### Offline Capabilities
- Service Worker caches static assets
- LocalForage stores auth data
- Future enhancement: IndexedDB for offline ticket creation

## Known Limitations & Future Enhancements

### Current MVP Limitations:
- Password hashing uses SHA-256 (production should use bcrypt)
- No email notifications (can add via Supabase triggers)
- No push notifications (PWA-ready for future implementation)
- No CSV export functionality (admin feature placeholder)
- No real-time updates via WebSockets (uses polling)

### Recommended Enhancements:
1. Implement push notifications for ticket updates
2. Add CSV export for admin reports
3. Implement advanced filtering (date ranges, priority)
4. Add ticket comments/history tracking
5. Implement offline ticket creation with sync
6. Add email notifications via Edge Functions
7. Implement bcrypt for password hashing
8. Add user management interface for admins
9. Implement machine management features
10. Add analytics dashboard for admins

## Deployment
The application is fully deployed and ready for use:
- Frontend: Static hosting via deployment service
- Backend: Supabase (database + edge functions + storage)
- All APIs tested and functional

## Maintenance
- Database accessible via Supabase dashboard
- Edge function logs available in Supabase
- Storage bucket management in Supabase dashboard
- User management via database or custom admin panel

## Support
For any issues:
1. Check browser console for errors
2. Verify network connectivity
3. Ensure JWT token is valid (24-hour expiration)
4. Check Supabase Edge Function logs
5. Verify database RLS policies allow user access
