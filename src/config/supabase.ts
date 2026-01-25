import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 환경변수 유효성 검사
const isSupabaseConfigured = SUPABASE_URL && SUPABASE_ANON_KEY;

// Supabase 클라이언트 생성 (환경변수 설정된 경우에만)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Supabase 연결 상태 확인
export function isSupabaseConnected(): boolean {
  return supabase !== null;
}

// 디버그용: 연결 상태 로그
if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] 환경변수가 설정되지 않았습니다. 로컬 저장소만 사용됩니다.\n' +
    'VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 .env 파일에 설정하세요.'
  );
} else {
  console.log('[Supabase] 클라이언트 초기화 완료');
}
