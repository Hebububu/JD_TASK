import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Compared against when the login id does not exist, so an unknown id costs
// the same bcrypt work as a wrong password (no user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', SALT_ROUNDS);

export interface JwtPayload {
  sub: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  /** Returns false when `hash` is undefined, after doing the same work. */
  async verifyPassword(plain: string, hash: string | undefined) {
    const matches = await bcrypt.compare(plain, hash ?? DUMMY_HASH);
    return hash !== undefined && matches;
  }

  async signToken(userId: string): Promise<{ access_token: string }> {
    const payload: JwtPayload = { sub: userId };
    return { access_token: await this.jwtService.signAsync(payload) };
  }
}
