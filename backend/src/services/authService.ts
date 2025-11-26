import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { runWriteTransaction, runReadTransaction } from '../config/neo4j.js';

// For authorization code flow from @react-oauth/google, use 'postmessage' as redirect URI
const oauth2Client = new OAuth2Client(
  config.oauth.clientId,
  config.oauth.clientSecret,
  'postmessage' // Special redirect URI for SPAs
);

export interface User {
  id: string;
  email: string;
  name: string;
  profilePictureUrl?: string;
  waitlisted: boolean;
  createdAt: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

/**
 * Check if email is whitelisted
 */
export function isWhitelisted(email: string): boolean {
  return config.whitelistedEmails.includes(email.toLowerCase());
}

/**
 * Exchange Google OAuth code for user tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const ticket = await oauth2Client.verifyIdToken({
    idToken: tokens.id_token!,
    audience: config.oauth.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error('No email in Google token');
  }

  return {
    email: payload.email,
    name: payload.name || 'Unknown User',
    profilePictureUrl: payload.picture,
  };
}

/**
 * Find or create user in Neo4j
 */
export async function findOrCreateUser(googleUser: {
  email: string;
  name: string;
  profilePictureUrl?: string;
}): Promise<User> {
  return await runWriteTransaction(async (tx) => {
    const result = await tx.run(
      `
      MERGE (u:User {email: $email})
      ON CREATE SET
        u.id = randomUUID(),
        u.name = $name,
        u.profilePictureUrl = $profilePictureUrl,
        u.waitlisted = false,
        u.createdAt = datetime()
      ON MATCH SET
        u.name = $name,
        u.profilePictureUrl = $profilePictureUrl,
        u.waitlisted = COALESCE(u.waitlisted, false)
      RETURN u
      `,
      {
        email: googleUser.email,
        name: googleUser.name,
        profilePictureUrl: googleUser.profilePictureUrl || null,
      }
    );

    const record = result.records[0];
    const node = record.get('u').properties;

    return {
      id: node.id,
      email: node.email,
      name: node.name,
      profilePictureUrl: node.profilePictureUrl,
      waitlisted: node.waitlisted || false,
      createdAt: new Date(node.createdAt),
    };
  });
}

/**
 * Generate JWT for user session
 */
export function generateJWT(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '24h',
    issuer: 'graph-starz',
  });
}

/**
 * Verify and decode JWT
 */
export function verifyJWT(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret, {
    issuer: 'graph-starz',
  }) as TokenPayload;
}

/**
 * Get user by ID from Neo4j
 */
export async function getUserById(userId: string): Promise<User | null> {
  return await runReadTransaction(async (tx) => {
    const result = await tx.run(
      `
      MATCH (u:User {id: $userId})
      RETURN u
      `,
      { userId }
    );

    if (result.records.length === 0) {
      return null;
    }

    const node = result.records[0].get('u').properties;
    return {
      id: node.id,
      email: node.email,
      name: node.name,
      profilePictureUrl: node.profilePictureUrl,
      waitlisted: node.waitlisted || false,
      createdAt: new Date(node.createdAt),
    };
  });
}

/**
 * Add user to waitlist
 */
export async function addToWaitlist(userId: string): Promise<User> {
  return await runWriteTransaction(async (tx) => {
    const result = await tx.run(
      `
      MATCH (u:User {id: $userId})
      SET u.waitlisted = true
      RETURN u
      `,
      { userId }
    );

    if (result.records.length === 0) {
      throw new Error('User not found');
    }

    const node = result.records[0].get('u').properties;
    return {
      id: node.id,
      email: node.email,
      name: node.name,
      profilePictureUrl: node.profilePictureUrl,
      waitlisted: node.waitlisted || false,
      createdAt: new Date(node.createdAt),
    };
  });
}
