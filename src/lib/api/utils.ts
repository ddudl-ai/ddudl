// API Utilities - 공통 API 유틸리티
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse, ApiError } from '@/types';

/**
 * 표준화된 API 응답 생성
 */
export function createApiResponse<T>(
  data?: T,
  success = true,
  message?: string,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success,
      data,
      message,
    },
    { status }
  );
}

/**
 * 표준화된 API error 응답 생성
 */
export function createApiError(
  message: string,
  status = 500,
  code?: string,
  details?: Record<string, unknown>
): NextResponse<ApiResponse> {
  const error: ApiError = {
    code: code || `HTTP_${status}`,
    message,
    details,
  };

  return NextResponse.json(
    {
      success: false,
      error: error.message,
      message,
    },
    { status }
  );
}

/**
 * authentication된 user 확인
 */
export async function authenticateUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, error: 'Unauthorized' };
    }

    return { user, error: null };
  } catch (err) {
    return { 
      user: null, 
      error: err instanceof Error ? err.message : 'Authentication failed' 
    };
  }
}

/**
 * URL에서 검색 파라미터 추출
 */
export function getSearchParams(request: NextRequest) {
  return new URL(request.url).searchParams;
}

/**
 * required 파라미터 확인
 */
export function validateRequiredParams(
  params: Record<string, string | null>,
  required: string[]
): { valid: boolean; missing: string[] } {
  const missing = required.filter(key => !params[key]);
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * 페이지네이션 파라미터 파싱
 */
export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * API 라우트 핸들러 래퍼 - error 처리와 로깅
 */
export function withApiHandler<T = unknown>(
  handler: (request: NextRequest, context?: unknown) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (request: NextRequest, context?: unknown): Promise<NextResponse<ApiResponse<T> | ApiResponse>> => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('API Error:', error);
      
      if (error instanceof Error) {
        return createApiError(error.message, 500, 'INTERNAL_ERROR', {
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      }
      
      return createApiError('Internal server error', 500);
    }
  };
}

/**
 * CORS 헤더 설정
 */
export function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

/**
 * Rate limiting (간단한 메모리 기반)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests = 100,
  windowMs = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}