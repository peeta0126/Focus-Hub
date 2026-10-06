# Focus Hub

개인 일정, 할 일, 프로젝트, 목표, 습관, 노트와 학습 기록을 한곳에서 관리하는 다크 테마 생산성 PWA입니다.

## 실행

```bash
npm install
npm run dev
```

Supabase를 연결하지 않으면 디자인과 기능을 살펴볼 수 있는 데모 데이터가 표시됩니다.

## Supabase 연결

1. `.env.example`을 `.env.local`로 복사하고 프로젝트 URL과 anon key를 입력합니다.
2. Supabase SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행합니다.
3. Supabase Authentication에서 개인용 Email/Password 사용자를 생성합니다.
4. 개발 서버를 다시 시작하면 `/login`과 RLS 기반 개인 데이터 저장이 활성화됩니다.

## 이미지와 PWA

프로젝트에 사용한 WebP 이미지와 PNG 앱 아이콘은 `public/assets`, `public/icons`에 있습니다. UI 텍스트와 컨트롤은 모두 HTML/CSS이며 이미지에는 포함하지 않았습니다.

## 검증

```bash
npm run lint
npm run build
```
