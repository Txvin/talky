// supabase.js — Configuração do cliente Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://ntfgfdtnnfuyuunacyxi.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50ZmdmZHRubmZ1eXV1bmFjeXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4Mjg3NjMsImV4cCI6MjEwMjQwNDc2M30.JRCwnCnrpI4pbM3vqB5307KsMtEmQSvE3CsTa-mxoxk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: {
    params: { eventsPerSecond: 20 }
  }
});
