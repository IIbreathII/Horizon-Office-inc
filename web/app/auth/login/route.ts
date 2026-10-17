import { forwardToAuthApi } from '../forward';

/** POST /auth/login — go-api, then the session cookie (see ../forward.ts). */
export function POST(request: Request) {
  return forwardToAuthApi('login', request);
}
