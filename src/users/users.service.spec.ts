import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { publicUserSelect, UsersService } from './users.service';

describe('UsersService', () => {
  const prisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const auth = {
    hashPassword: jest.fn().mockResolvedValue('hashed'),
    verifyPassword: jest.fn(),
    signToken: jest.fn().mockResolvedValue({ access_token: 'token' }),
  };
  const service = new UsersService(
    prisma as unknown as PrismaService,
    auth as unknown as AuthService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('signup stores the hash and selects only public fields', async () => {
    prisma.user.create.mockResolvedValue({ id: 'alice' });
    await expect(
      service.signup({ id: 'alice', password: 'password123' }),
    ).resolves.toEqual({ id: 'alice' });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { id: 'alice', password: 'hashed' },
      select: publicUserSelect,
    });
  });

  it('publicUserSelect never includes the password', () => {
    expect(publicUserSelect).toEqual({ id: true });
  });

  it('updatePassword re-hashes the new password', async () => {
    prisma.user.update.mockResolvedValue({ id: 'alice' });
    await service.updatePassword('alice', 'new-password');
    expect(auth.hashPassword).toHaveBeenCalledWith('new-password');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'alice' },
      data: { password: 'hashed' },
      select: publicUserSelect,
    });
  });

  it('findById selects only public fields', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'alice' });
    await service.findById('alice');
    expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'alice' },
      select: publicUserSelect,
    });
  });

  describe('login', () => {
    it('returns a token for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'alice', password: 'h' });
      auth.verifyPassword.mockResolvedValue(true);
      await expect(
        service.login({ id: 'alice', password: 'password123' }),
      ).resolves.toEqual({ access_token: 'token' });
      expect(auth.signToken).toHaveBeenCalledWith('alice');
    });

    it('still runs password verification for an unknown id', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      auth.verifyPassword.mockResolvedValue(false);
      await expect(
        service.login({ id: 'nobody', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(auth.verifyPassword).toHaveBeenCalledWith(
        'password123',
        undefined,
      );
      expect(auth.signToken).not.toHaveBeenCalled();
    });

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'alice', password: 'h' });
      auth.verifyPassword.mockResolvedValue(false);
      await expect(
        service.login({ id: 'alice', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
