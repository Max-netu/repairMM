import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://zcnxntvybabfatygwjjs.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbnhudHZ5YmFiZmF0eWd3ampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDE0MzIsImV4cCI6MjA3Nzc3NzQzMn0.yfX-qeykmaiKccpiVrwY_KMPy_9cyZOma58C0eljk3U";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'technician' | 'club';
  club_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: number;
  name: string;
  city: string;
  address: string;
}

export interface Machine {
  id: number;
  club_id: number;
  number: string;
  model: string;
}

export interface Ticket {
  id: number;
  club_id: number;
  machine_id: number;
  title: string;
  description: string;
  status: 'new' | 'in_progress' | 'waiting_parts' | 'waiting_tax' | 'closed';
  priority: 'low' | 'normal' | 'high';
  assigned_technician_id: number | null;
  created_by_user_id: number;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  club?: Club;
  machine?: Machine;
  created_by?: User;
  assigned_technician?: User;
  attachments?: TicketAttachment[];
}

export interface TicketAttachment {
  id: number;
  ticket_id: number;
  file_url: string;
  filename: string;
  uploaded_at: string;
}

export interface DashboardStats {
  total: number;
  new: number;
  in_progress: number;
  waiting_parts: number;
  waiting_tax: number;
  closed: number;
  high_priority: number;
  by_status: {
    new: number;
    in_progress: number;
    waiting_parts: number;
    waiting_tax: number;
    closed: number;
  };
  by_club?: Array<{
    club_id: number;
    club_name: string;
    total: number;
    new: number;
    in_progress: number;
    closed: number;
  }>;
}
