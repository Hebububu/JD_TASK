import { PartialType } from '@nestjs/swagger';
import { CreateTodoDto } from './create-todo.dto';

/** PUT is a partial update: omitted fields stay unchanged. */
export class UpdateTodoDto extends PartialType(CreateTodoDto) {}
