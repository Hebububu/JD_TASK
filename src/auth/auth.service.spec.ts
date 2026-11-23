import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const signAsync = jest.fn().mockResolvedValue('signed.jwt');
  const jwtService = { signAsync } as unknown as JwtService;
  const service = new AuthService(jwtService);

  it('hashes a password into something other than the plaintext', async () => {
    const hash = await service.hashPassword('password123');
    expect(hash).not.toBe('password123');
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await service.hashPassword('password123');
    await expect(service.verifyPassword('password123', hash)).resolves.toBe(
      true,
    );
    await expect(service.verifyPassword('wrong', hash)).resolves.toBe(false);
  });

  it('returns false when there is no stored hash (unknown user)', async () => {
    await expect(
      service.verifyPassword('timing-equalizer', undefined),
    ).resolves.toBe(false);
  });

  it('signs a token with the user id as subject', async () => {
    await expect(service.signToken('alice')).resolves.toEqual({
      access_token: 'signed.jwt',
    });
    expect(signAsync).toHaveBeenCalledWith({ sub: 'alice' });
  });
});
