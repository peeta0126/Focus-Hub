# 인증 설정과 검증

현재 코드의 기준은 [AuthForm](src/components/auth/AuthForm.tsx), [proxy](src/proxy.ts), [확인 Route Handler](src/app/auth/confirm/route.ts)입니다.

## 계정 흐름

- 가입은 8자 이상 비밀번호와 확인 입력을 검사하고 Supabase `signUp`을 호출합니다. 기존 계정 로그인은 6자 이상 입력을 허용합니다.
- 가입·인증 재전송은 `/auth/confirm`, 비밀번호 복구는 `/auth/confirm?type=recovery`로 돌아옵니다.
- 확인 경로는 token hash 검증 또는 PKCE code 교환 후 가입은 `/`, 복구는 `/reset-password`로 보냅니다. 임의의 `next` URL은 따르지 않습니다.
- proxy가 세션 쿠키를 갱신하고 보호 페이지 접근을 검사합니다. 로그아웃은 현재 브라우저 세션을 대상으로 합니다.
- 신규 계정에 샘플 데이터를 자동 삽입하지 않습니다.

## Supabase 설정

1. [.env.example](.env.example)의 URL·anon key를 로컬 환경에 설정합니다. 브라우저에 service role 키를 넣지 않습니다.
2. 이메일 로그인·회원가입·이메일 확인을 활성화합니다.
3. Site URL을 실제 origin으로 설정하고 아래 확인 경로를 Redirect URLs에 등록합니다. 다른 포트·운영 도메인도 실제 값으로 별도 등록합니다.

```text
http://localhost:3000/auth/confirm
http://localhost:3000/auth/confirm?type=recovery
```

4. 이메일 템플릿의 가입 확인 링크는 다음 서버 경로로 연결합니다. 복구 템플릿은 동일 경로에 `type=recovery`를 사용합니다.

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup">이메일 확인</a>
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">비밀번호 재설정</a>
```

운영 SMTP와 발송 제한은 공급자 설정을 확인해야 합니다. 메일 발송 API 성공을 실제 수신 성공으로 간주하지 않습니다. 비밀번호·인증 토큰·실제 연결 문자열은 문서와 저장소에 기록하지 않습니다.

## DB와 계정 격리

새 프로젝트에만 [초기 스키마](supabase/schema.sql)를 적용합니다. 기존 프로젝트는 [증분 SQL](supabase/migrations)을 검토합니다. 모든 개인 데이터 접근에 사용자 조건을 적용하며 SQL에는 소유자 RLS와 연결된 프로젝트·할 일의 소유권 검사도 정의되어 있습니다.

SQL 정의의 존재는 운영 적용 완료 증거가 아닙니다. 실제 검증은 별도 테스트 계정 A/B의 일반 사용자 세션으로 수행합니다. B가 A의 행을 조회·변경·삭제하거나 A의 사용자 ID로 삽입할 수 없어야 하며, 다른 계정의 프로젝트/할 일 ID 연결도 거부되어야 합니다. service role·SQL Editor의 관리자 역할은 이 검증에 쓰지 않습니다. 기존 사용자 데이터는 건드리지 않습니다.

## 자동 검사와 운영 확인의 차이

```sh
npx playwright install chromium
npm run test:auth -- tests/auth.spec.ts
```

[테스트 설정](playwright.config.ts)은 실제 환경 대신 `127.0.0.1:54329`의 HTTP fixture와 가짜 공개 키를 Next 서버(3197)에 전달합니다. 가입·확인·노트 저장·로그아웃·계정 전환·복구·오류 복구를 검사합니다. 이는 SMTP 발송과 PostgreSQL RLS 실행 검사가 아닙니다.

운영에서는 새 테스트 계정으로 메일 수신·만료 링크·새로고침 후 세션·로그아웃 후 접근 차단·두 계정 격리·비밀번호 변경 후 재로그인을 따로 확인해야 합니다. 이번 문서 작업은 운영 계정이나 설정을 변경하지 않습니다.
