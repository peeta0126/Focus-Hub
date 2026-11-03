export const AUTH_FORM_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/resend"];
export const PUBLIC_AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/auth/resend", "/auth/confirm"];

export function authErrorMessage(error: { code?: string; status?: number }) {
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  switch (error.code) {
    case "email_not_confirmed": return "이메일 인증이 필요합니다. 받은 메일을 확인하거나 인증 메일을 다시 요청해주세요.";
    case "invalid_credentials": return "이메일 또는 비밀번호를 확인해주세요.";
    case "user_already_exists": case "email_exists": return "이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정해주세요.";
    case "weak_password": return "비밀번호가 보안 기준에 맞지 않습니다. 더 길고 다양한 문자를 사용해주세요.";
    case "same_password": return "기존 비밀번호와 다른 비밀번호를 입력해주세요.";
    case "signup_disabled": case "email_provider_disabled": return "현재 회원가입을 사용할 수 없습니다. 관리자에게 문의해주세요.";
    case "email_address_invalid": case "validation_failed": return "이메일과 입력 내용을 확인해주세요.";
    case "otp_expired": return "인증 링크가 만료되었거나 이미 사용되었습니다. 새 메일을 요청해주세요.";
    default: return "요청을 처리하지 못했습니다. 연결 상태를 확인하고 잠시 후 다시 시도해주세요.";
  }
}
