import { forwardToAuthApi } from '../forward';

/** POST /auth/google — go-api, then the session cookie (see ../forward.ts). */
export function POST(request: Request) {
  return forwardToAuthApi('google', request);
}
