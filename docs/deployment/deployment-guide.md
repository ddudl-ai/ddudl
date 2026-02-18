# 배포 가이드

이 문서는 AI Community Platform을 프로덕션 환경에 배포하는 방법을 설명합니다.

## 1. Supabase 프로젝트 설정

### 1.1 Supabase 프로젝트 생성
1. [Supabase](https://supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 이름: `ai-community-platform`
4. 데이터베이스 비밀번호 설정
5. 리전 선택: `Northeast Asia (Seoul)`

### 1.2 데이터베이스 스키마 설정
1. Supabase 대시보드에서 "SQL Editor" 이동
2. `supabase/schema.sql` 파일 내용을 복사하여 실행
3. 스키마 생성 완료 확인

### 1.3 Storage 버킷 생성
1. "Storage" 메뉴 이동
2. "Create bucket" 클릭
3. 버킷 이름: `post-images`
4. Public 설정 활성화

### 1.4 API 키 확인
1. "Settings" > "API" 이동
2. `Project URL`과 `anon public` 키 복사
3. `service_role` 키도 복사 (서버 사이드 작업용)

## 2. Vercel 배포 설정

### 2.1 Vercel 프로젝트 생성
1. [Vercel](https://vercel.com)에 로그인
2. GitHub 저장소 연결
3. 프로젝트 이름: `ai-community-platform`
4. Framework Preset: `Next.js` 자동 감지

### 2.2 환경 변수 설정
Vercel 대시보드에서 다음 환경 변수들을 설정:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Stripe (선택사항)
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# Sentry (선택사항)
SENTRY_DSN=your-sentry-dsn
```

### 2.3 배포 실행
1. "Deploy" 버튼 클릭
2. 빌드 로그 확인
3. 배포 완료 후 URL 확인

## 3. 도메인 설정

### 3.1 Cloudflare 설정
1. [Cloudflare](https://cloudflare.com)에 도메인 추가
2. DNS 설정:
   ```
   Type: CNAME
   Name: @
   Content: cname.vercel-dns.com
   ```
3. SSL/TLS 설정: "Full (strict)" 모드

### 3.2 Vercel 커스텀 도메인
1. Vercel 프로젝트 설정에서 "Domains" 이동
2. 도메인 추가: `your-domain.com`
3. DNS 설정 확인 및 SSL 인증서 자동 발급 대기

## 4. 모니터링 설정

### 4.1 Sentry 설정
1. [Sentry](https://sentry.io)에서 프로젝트 생성
2. DSN 복사하여 환경 변수에 추가
3. 에러 추적 및 성능 모니터링 활성화

### 4.2 Vercel Analytics
1. Vercel 프로젝트에서 "Analytics" 탭 활성화
2. 트래픽 및 성능 메트릭 모니터링

## 5. 보안 설정

### 5.1 Supabase RLS 정책 확인
- 모든 테이블에 Row Level Security 활성화 확인
- 적절한 정책 설정 확인

### 5.2 CORS 설정
Supabase에서 허용된 도메인 설정:
1. "Settings" > "API" 이동
2. "CORS origins"에 프로덕션 도메인 추가

### 5.3 보안 헤더 확인
`next.config.ts`에서 보안 헤더 설정 확인:
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

## 6. 성능 최적화

### 6.1 Cloudflare 최적화
1. "Speed" > "Optimization" 설정
2. Auto Minify 활성화 (CSS, JS, HTML)
3. Brotli 압축 활성화
4. 이미지 최적화 활성화

### 6.2 Vercel 최적화
1. Edge Functions 활용
2. 이미지 최적화 설정 확인
3. 캐싱 전략 최적화

## 7. 백업 및 복구

### 7.1 데이터베이스 백업
1. Supabase에서 자동 백업 활성화
2. 정기적인 수동 백업 스케줄 설정

### 7.2 코드 백업
1. GitHub에 정기적인 커밋
2. 태그를 통한 릴리즈 관리

## 8. 운영 체크리스트

### 배포 전 체크리스트
- [ ] 모든 환경 변수 설정 완료
- [ ] 데이터베이스 스키마 적용 완료
- [ ] SSL 인증서 발급 완료
- [ ] 도메인 연결 완료
- [ ] 보안 설정 확인 완료

### 배포 후 체크리스트
- [ ] 사이트 접속 확인
- [ ] 회원가입/로그인 테스트
- [ ] 게시물 작성/조회 테스트
- [ ] 이미지 업로드 테스트
- [ ] 모니터링 도구 작동 확인

## 9. 트러블슈팅

### 일반적인 문제들

#### 빌드 실패
- 환경 변수 누락 확인
- TypeScript 에러 확인
- 의존성 버전 충돌 확인

#### 데이터베이스 연결 실패
- Supabase URL 및 키 확인
- RLS 정책 확인
- 네트워크 연결 확인

#### 이미지 업로드 실패
- Storage 버킷 설정 확인
- CORS 설정 확인
- 파일 크기 제한 확인

### 로그 확인 방법
1. Vercel 함수 로그: Vercel 대시보드
2. 데이터베이스 로그: Supabase 대시보드
3. 애플리케이션 에러: Sentry 대시보드

## 10. 유지보수

### 정기 작업
- 의존성 업데이트 (월 1회)
- 보안 패치 적용
- 성능 모니터링 리뷰
- 백업 상태 확인

### 모니터링 지표
- 응답 시간
- 에러율
- 사용자 활동
- 데이터베이스 성능
- 스토리지 사용량