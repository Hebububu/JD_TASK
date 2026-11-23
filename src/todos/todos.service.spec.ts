import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TodosService } from './todos.service';

describe('TodosService', () => {
  const prisma = {
    todo: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const service = new TodosService(prisma as unknown as PrismaService);
  const todo = { id: 1, title: 't', userId: 'alice' };

  beforeEach(() => jest.clearAllMocks());

  it('create attaches the owner', async () => {
    await service.create('alice', { title: 't' });
    expect(prisma.todo.create).toHaveBeenCalledWith({
      data: { title: 't', userId: 'alice' },
    });
  });

  it('findAll scopes by owner', async () => {
    await service.findAll('alice');
    expect(prisma.todo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'alice' } }),
    );
  });

  it('findOne scopes by id and owner', async () => {
    prisma.todo.findFirst.mockResolvedValue(todo);
    await expect(service.findOne('alice', 1)).resolves.toBe(todo);
    expect(prisma.todo.findFirst).toHaveBeenCalledWith({
      where: { id: 1, userId: 'alice' },
    });
  });

  it('findOne throws NotFound when nothing matches', async () => {
    prisma.todo.findFirst.mockResolvedValue(null);
    await expect(service.findOne('alice', 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('search scopes by owner and matches the title only', async () => {
    await service.search('alice', 'milk');
    expect(prisma.todo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'alice', title: { contains: 'milk' } },
      }),
    );
  });

  it('update scopes the write by owner', async () => {
    prisma.todo.updateMany.mockResolvedValue({ count: 1 });
    prisma.todo.findFirst.mockResolvedValue(todo);
    await service.update('alice', 1, { completed: true });
    expect(prisma.todo.updateMany).toHaveBeenCalledWith({
      where: { id: 1, userId: 'alice' },
      data: { completed: true },
    });
  });

  it('update throws NotFound when no owned row was changed', async () => {
    prisma.todo.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.update('bob', 1, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove scopes the delete by owner and throws NotFound otherwise', async () => {
    prisma.todo.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove('bob', 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.todo.deleteMany).toHaveBeenCalledWith({
      where: { id: 1, userId: 'bob' },
    });
  });
});
