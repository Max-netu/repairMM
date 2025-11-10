import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://zcnxntvybabfatygwjjs.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbnhudHZ5YmFiZmF0eWd3ampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDE0MzIsImV4cCI6MjA3Nzc3NzQzMn0.yfX-qeykmaiKccpiVrwY_KMPy_9cyZOma58C0eljk3U";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'technician' | 'hall';
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
  title: string;
  description: string;
  status: 'novo' | 'u_tijeku' | 'čeka se rezervni dio' | 'čeka se porezna' | 'zatvoreno';
  assigned_technician_id: number | null;
  created_by_user_id: number;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // New workflow fields
  serial_number: string;
  inventory_number: string;
  employee_name?: string;
  manufacturer?: string;
  game_name?: string;
  can_play?: 'da' | 'ne';
  request_number?: string;
  comments?: string;
  club?: Club;
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

export interface StatusHistory {
  id: number;
  request_id: number;
  old_status: string | null;
  new_status: string;
  comment: string;
  changed_by: number;
  created_at: string;
  user?: User;
}

export interface DashboardStats {
  total: number;
  // Хорватские ключи (основные)
  novo: number;
  u_tijeku: number;
  'čeka se rezervni dio': number;
  'čeka se porezna': number;
  zatvoreno: number;
  // Английские ключи (альтернативные, на случай обратной совместимости)
  new?: number;
  in_progress?: number;
  waiting_parts?: number;
  waiting_tax?: number;
  completed?: number;
  by_status: {
    // Хорватские ключи
    novo: number;
    u_tijeku: number;
    'čeka se rezervni dio': number;
    'čeka se porezna': number;
    zatvoreno: number;
    // Английские ключи
    new?: number;
    in_progress?: number;
    waiting_parts?: number;
    waiting_tax?: number;
    completed?: number;
  };
  by_club?: Array<{
    club_id: number;
    club_name: string;
    total: number;
    // Хорватские ключи
    novo: number;
    u_tijeku: number;
    zatvoreno: number;
    // Английские ключи
    new?: number;
    in_progress?: number;
    completed?: number;
  }>;
}