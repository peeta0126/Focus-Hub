# Focus Hub

개인 일정, 할 일, 프로젝트, 목표, 습관, 노트와 학습 기록을 한곳에서 관리하는 다크 테마 생산성 PWA입니다.

## 실행

```bash
npm install
npm run dev
```

계정 인증과 개인 데이터 저장을 사용하려면 Supabase 환경 변수를 설정해야 합니다.

## Supabase 연결

1. `.env.example`을 `.env.local`로 복사하고 프로젝트 URL과 anon key를 입력합니다.
2. Supabase SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행합니다.
3. [인증 설정 안내](docs/auth-setup.md)에 따라 신규 가입, 이메일 인증, SMTP 및 이메일 템플릿을 설정합니다.
4. 개발 서버를 다시 시작하면 `/signup`에서 일반 사용자가 가입하고 각자의 작업 공간을 이용할 수 있습니다.

기존 프로젝트에는 `schema.sql`을 다시 실행하지 않습니다. 이번 회원가입 기능은 DB 마이그레이션이 필요하지 않으며 기존 데이터와 정책을 변경하지 않습니다.

## 이미지와 PWA

프로젝트에 사용한 WebP 이미지와 PNG 앱 아이콘은 `public/assets`, `public/icons`에 있습니다. UI 텍스트와 컨트롤은 모두 HTML/CSS이며 이미지에는 포함하지 않았습니다.

## 검증

```bash
npm run lint
npm run build
npm run test:auth
```

`test:auth`는 실제 Supabase 대신 격리된 로컬 인증·데이터 fixture로 데스크톱/모바일 흐름을 검사합니다. 최초 실행 전 `npx playwright install chromium`이 필요합니다. 실제 메일 발송과 운영 DB RLS 점검은 [별도 체크리스트](docs/auth-setup.md)를 참고하세요.
