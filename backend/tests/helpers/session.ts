import { generateJWT } from '../../src/services/authService.js';
import { FakeUser } from './fakes.js';

/** Authorization header value with a real session token for `user`, signed the way sign-in signs it. */
export function bearer(user: FakeUser): string {
  const token = generateJWT({
    ...user,
    waitlisted: user.waitlisted ?? false,
    createdAt: new Date(),
  });
  return `Bearer ${token}`;
}
