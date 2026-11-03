# 일반 사용자 인증 설정 및 검증

## 구현과 데이터 보존

- `/signup`: 이메일, 비밀번호(8자 이상), 확인 입력. Supabase `signUp`을 호출하고 이메일 인증을 안내합니다. 기존 6자 이상 비밀번호의 로그인도 유지합니다.
- `/auth/resend`: 가입 인증 메일 재전송. `/forgot-password`: 재설정 메일 발송. 발송 성공 후 60초 동안 재전송을 막습니다. 실제 rate limit은 Supabase에서 적용합니다.
- `/auth/confirm`: `token_hash` + `type=email|signup|recovery`를 `verifyOtp`로 검증하고 SSR 쿠키에 세션을 저장합니다. PKCE `code` 교환도 지원합니다. 가입 인증은 `/`, 복구 인증은 `/reset-password`로 이동합니다. URL의 `next` 값은 사용하지 않습니다.
- 로그인된 사용자의 `/login`, `/signup` 접근은 `/`로 이동합니다. 비로그인 사용자는 인증 화면과 확인 링크에 접근할 수 있고 개인 작업 페이지는 로그인해야 합니다. `/reset-password`는 유효한 세션을 서버와 클라이언트 양쪽에서 확인합니다.
- 로그인/로그아웃은 전체 페이지 이동으로 이전 계정의 React 상태와 Router Cache를 비웁니다. 로그아웃은 기존 `scope: local`을 유지합니다. 인증 응답은 `private, no-store`로 처리합니다. 기존 서비스 워커는 인증 URL·HTML·API를 캐시하지 않습니다.
- 비밀번호는 Supabase Auth에서만 관리하며 앱 테이블이나 브라우저 저장소에 별도로 저장하지 않습니다.
- 가입 시 앱 테이블에 샘플 데이터나 설정 행을 삽입하지 않습니다. 새 사용자는 빈 개인 작업 공간과 기본 UI 설정에서 시작합니다.
- 기존 `schema.sql`, 마이그레이션과 CRUD 코드는 유지합니다. 운영 DB에 DDL/DML을 실행하거나 기존 사용자 데이터를 변경하지 않습니다.

## Supabase Dashboard에서 설정할 사항

1. **Authentication → Sign In / Providers → Email**: 이메일 로그인, 신규 사용자 가입을 활성화하고 **Confirm email**을 켭니다. 비밀번호 최소 길이는 8자 이상을 권장합니다. 더 강한 프로젝트 정책으로 거부되면 화면에 보안 기준 오류가 표시됩니다.
2. **Authentication → URL Configuration**: Site URL을 실제 서비스 origin(예: `https://focus.example.com`)으로 설정합니다. Redirect URLs에 아래 URL을 개발·운영 각각 등록합니다. 임의 도메인 wildcard보다 정확한 URL을 사용합니다.

   ```text
   http://localhost:3000/auth/confirm
   http://localhost:3000/auth/confirm?type=recovery
   https://focus.example.com/auth/confirm
   https://focus.example.com/auth/confirm?type=recovery
   ```

   `127.0.0.1`이나 다른 포트를 사용한다면 그 origin도 등록합니다. 등록할 실제 주소는 앱에 접속하는 주소와 같아야 합니다.

3. **Authentication → Email Templates → Confirm signup**의 링크를 다음으로 설정합니다. `RedirectTo`에는 `signUp`/`resend`가 지정한 앱 origin이 포함되어 개발·운영을 구분합니다. 이 서버 검증 방식은 이메일을 다른 브라우저에서 열어도 사용할 수 있습니다.

   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">이메일 인증하고 시작하기</a>
   ```

4. **Reset Password**의 링크를 다음으로 설정합니다. 앱이 이미 `?type=recovery`를 전달하므로 `&token_hash=`로 이어야 합니다.

   ```html
   <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}">새 비밀번호 설정하기</a>
   ```

   템플릿 변경 전 발송된 링크는 다시 발송해 확인합니다. 템플릿을 기본 `ConfirmationURL`로 유지할 경우 같은 브라우저의 PKCE verifier가 필요하므로 위 token hash 템플릿을 권장합니다.

5. **Authentication → Email / SMTP Settings**: 일반 사용자에게 메일을 보낼 수 있는 Custom SMTP, 발신 주소와 도메인을 설정하고 발송 제공자의 도메인 인증을 완료합니다. Supabase 기본 메일 서비스의 수신자·발송량 제한은 공개 서비스에 적합하지 않습니다. 메일 제공자의 링크 추적 기능은 인증 링크를 손상하지 않는지 확인합니다.
6. Auth의 OTP 만료 시간과 rate limit을 서비스에 맞게 설정합니다. 가입 결과·재전송 결과는 이미 가입한 이메일이나 존재하지 않는 이메일의 상태를 과도하게 노출하지 않도록 안내합니다.
7. 배포 환경에도 기존 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 설정합니다. 이번 작업에 service role key는 필요하지 않습니다.

참고: [Supabase 이메일 템플릿](https://supabase.com/docs/guides/auth/auth-email-templates), [비밀번호 인증과 복구](https://supabase.com/docs/guides/auth/passwords), [SSR 세션](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## RLS 검토

리포지토리의 12개 테이블(`projects`, `tasks`, `goals`, `daily_goals`, `habits`, `habit_records`, `notes`, `journal_entries`, `cs_study_logs`, `resources`, `events`, `settings`)은 `auth.users`를 참조하는 `user_id`를 사용합니다. `auth.uid() = user_id` 기반 SELECT/INSERT/UPDATE/DELETE 정책과 UPDATE의 `WITH CHECK`가 있습니다. 작업의 프로젝트, 습관 기록의 습관, 일정의 원본 작업도 같은 사용자 소유인지 검사합니다. 조회·변경·삭제 쿼리는 사용자 조건을 사용하고 삽입 시 현재 사용자의 ID를 설정합니다.

운영 DB가 리포지토리와 동일한지는 Dashboard SQL Editor에서 아래 **읽기 전용** 쿼리로 확인합니다. 스키마 파일 전체를 재실행하거나 테이블·정책을 재생성하지 않습니다. 아래 결과에서 RLS 비활성화, 예상하지 못한 공개 정책, 소유권 조건 누락 여부를 확인합니다. 실제로 다른 사용자의 행을 차단하는지는 두 계정으로 별도 검증해야 합니다.

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;
```

## 자동 검증과 실제 서비스 검증의 구분

이번 작업의 검증 결과: `npm run lint`, `npm run build` 통과. Chromium 기반 데스크톱·모바일 테스트 총 6개 통과. 연결된 Supabase의 공개 `/auth/v1/settings`에서 이메일 로그인 활성화, 신규 가입 허용, 이메일 자동 인증 비활성화(이메일 인증 필수)를 읽기 전용으로 확인했습니다. 실제 SMTP 발송·수신, 운영 DB의 현재 RLS 정책 및 실제 두 계정 간 차단은 메일함/테스트 계정 접근 정보가 없어 검증하지 않았습니다. 기존 계정·데이터·DB 정책은 변경하지 않았습니다.

```sh
npm run lint
npm run build
npx playwright install chromium
npm run test:auth
```

Playwright는 `127.0.0.1:3100`의 Next 개발 서버와 `127.0.0.1:54329`의 독립 HTTP fixture를 실행합니다. 테스트 서버에는 실제 `.env.local` 대신 로컬 URL과 가짜 anon key를 전달합니다. 실제 계정·메일·DB를 사용하거나 변경하지 않습니다. 다른 개발 서버가 이미 실행 중이면 Next 개발 서버 lock 충돌을 피하도록 먼저 종료해야 합니다.

자동 검증 범위: 공개·보호 경로, 입력 검증, 미인증 로그인 거부, 인증 링크 처리, 로그인 후 가입 화면 차단, 노트 저장, 로그아웃, 재로그인 후 유지, 두 번째 계정의 빈 공간, 메일 재전송과 재설정, 데스크톱·모바일 overflow. fixture의 소유권 필터는 앱의 계정 전환 동작을 검사하기 위한 것으로 실제 PostgreSQL RLS 검증을 대체하지 않습니다.

실제 서비스에서는 다음을 테스트용 새 이메일 두 개로 수행합니다.

1. A 계정을 `/signup`에서 가입하고 실제 인증 메일이 도착하는지 확인합니다. 인증 전 로그인 거부, 재전송, 만료·이미 사용한 링크 오류도 확인합니다.
2. 최신 메일을 같은 브라우저 및 다른 브라우저에서 열어 `/`로 이동하고 새로고침 후 세션이 유지되는지 확인합니다. 단일 링크는 한 번만 유효하므로 다른 브라우저 검증에는 새 링크를 사용합니다.
3. 작업 공간이 비어 있는지 확인하고 작업·노트 등을 생성, 수정, 삭제합니다. A의 테스트 데이터 하나는 재로그인 확인용으로 남겨둡니다.
4. 로그아웃 후 보호 경로가 `/login`으로 이동하는지, A로 재로그인하면 저장한 데이터가 유지되는지 확인합니다.
5. B를 새로 가입하고 빈 공간에서 시작하는지 확인합니다. A 데이터가 목록이나 URL 직접 접근으로 노출되지 않아야 합니다.
6. B의 일반 사용자 세션(anon key + B access token)으로 A의 테스트 행을 ID로 SELECT/UPDATE/DELETE해 반환 행이 없고 A의 데이터가 보존되는지 확인합니다. A의 `user_id`로 INSERT하거나 소유권을 다른 사용자로 UPDATE하면 RLS 오류가 나야 합니다. 외부 사용자 프로젝트·습관·작업의 ID를 연결하려는 INSERT/UPDATE도 거부되어야 합니다. service role이나 SQL Editor 관리자 역할은 RLS를 우회하므로 이 검증에 사용하지 않습니다.
7. `/forgot-password`에서 실제 메일을 받은 뒤 새 비밀번호를 설정합니다. 로그아웃 후 기존 비밀번호는 거부되고 새 비밀번호로 로그인되어야 합니다. A의 저장 데이터도 유지되어야 합니다.
8. 기존 사용자 데이터는 수정·삭제하지 않습니다. 검증용 데이터 정리는 새 테스트 계정의 데이터에만 수행합니다.
