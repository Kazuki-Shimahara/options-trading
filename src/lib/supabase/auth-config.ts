/** 認証不要な公開パス */
export const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
]

/** 指定パスが認証不要かどうかを判定 */
export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path.startsWith(p))
}
