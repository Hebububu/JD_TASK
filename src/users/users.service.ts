import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

/** The only user fields that ever leave this service. Never includes password. */
export const publicUserSelect = { id: true } as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /** Duplicate id -> Prisma P2002 -> 409 via PrismaExceptionFilter. */
  async signup(dto: SignupDto) {
    return this.prisma.user.create({
      data: {
        id: dto.id,
        password: await this.auth.hashPassword(dto.password),
      },
      select: publicUserSelect,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.id },
      select: { id: true, password: true },
    });
    const valid = await this.auth.verifyPassword(dto.password, user?.password);
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid id or password');
    }
    return this.auth.signToken(user.id);
  }

  findById(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: publicUserSelect,
    });
  }

  async updatePassword(id: string, password: string) {
    return this.prisma.user.update({
      where: { id },
      data: { password: await this.auth.hashPassword(password) },
      select: publicUserSelect,
    });
  }

  /** Todos are removed by `onDelete: Cascade`. */
  async remove(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
