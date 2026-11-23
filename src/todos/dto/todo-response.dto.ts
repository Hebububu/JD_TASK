import { ApiProperty } from '@nestjs/swagger';
import type { Todo } from '@prisma/client';

export class TodoResponseDto implements Todo {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Buy milk' })
  title: string;

  @ApiProperty({ type: String, nullable: true, example: '2 liters' })
  description: string | null;

  @ApiProperty({ example: false })
  completed: boolean;

  @ApiProperty({ example: 'alice_01' })
  userId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
