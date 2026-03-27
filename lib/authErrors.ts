const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'Please confirm your email before signing in.',
  'User already registered': 'An account with this email already exists.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters.',
  'signup_disabled': 'Sign ups are currently disabled.',
  'email rate limit exceeded': 'Too many attempts. Please try again later.',
  'over_email_send_rate_limit': 'Too many attempts. Please try again later.',
}

export function friendlyAuthError(message: string): string {
  for (const [key, friendly] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return friendly
  }
  return 'Something went wrong. Please try again.'
}
