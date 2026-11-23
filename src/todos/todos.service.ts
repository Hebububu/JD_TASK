import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

/**
 * Every query is scoped by `userId`. A todo owned by someone else is
 * indistinguishable from one that does not exist (404, never 403).
 */
@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateTodoDto) {
    return this.prisma.todo.create({
      data: {
        title: dto.title,
        description: dto.description,
        completed: dto.completed,
        userId,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.todo.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(userId: string, id: number) {
    const todo = await this.prisma.todo.findFirst({ where: { id, userId } });
    if (!todo) {
      throw new NotFoundException(`Todo ${id} not found`);
    }
    return todo;
  }

  /** Searches by title only, as the spec defines. */
  search(userId: string, keyword: string) {
    return this.prisma.todo.findMany({
      where: { userId, title: { contains: keyword } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async update(userId: string, id: number, dto: UpdateTodoDto) {
    const { count } = await this.prisma.todo.updateMany({
      where: { id, userId },
      data: dto,
    });
    if (count === 0) {
      throw new NotFoundException(`Todo ${id} not found`);
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: number): Promise<void> {
    const { count } = await this.prisma.todo.deleteMany({
      where: { id, userId },
    });
    if (count === 0) {
      throw new NotFoundException(`Todo ${id} not found`);
    }
  }
}
