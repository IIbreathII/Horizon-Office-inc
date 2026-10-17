import { forwardToAuthApi } from '../forward';

/** POST /auth/register — go-api, then the session cookie (see ../forward.ts). */
export function POST(request: Request) {
  return forwardToAuthApi('register', request);
}
