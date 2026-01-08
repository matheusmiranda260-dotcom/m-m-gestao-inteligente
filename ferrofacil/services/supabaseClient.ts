
import { createClient } from '@supabase/supabase-js';

// Hardcoding credentials to ensure connection while environment variables are being debugged
const supabaseUrl = 'https://xrdjtitpxhraqutzoheg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZGp0aXRweGhyYXF1dHpvaGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjYyNTksImV4cCI6MjA4MDcwMjI1OX0.-JWtKt_GwhA7bZFBXlgCFvmc5T9R45dxusCa_B23wWc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

