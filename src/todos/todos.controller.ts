import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { CreateTodoDto } from './dto/create-todo.dto';
import { SearchTodoDto } from './dto/search-todo.dto';
import { TodoResponseDto } from './dto/todo-response.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodosService } from './todos.service';

const NOT_FOUND = {
  type: ErrorResponseDto,
  description: 'No such todo, or it belongs to another user',
};

@ApiTags('todos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Missing, invalid or expired token',
})
@UseGuards(JwtAuthGuard)
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Post()
  @ApiOperation({ summary: 'Create a todo' })
  @ApiCreatedResponse({ type: TodoResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTodoDto,
  ): Promise<TodoResponseDto> {
    return this.todosService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my todos, newest first' })
  @ApiOkResponse({ type: [TodoResponseDto] })
  findAll(@CurrentUser() user: AuthUser): Promise<TodoResponseDto[]> {
    return this.todosService.findAll(user.id);
  }

  // Must be declared before ':id', otherwise "search" is matched as an id.
  @Get('search')
  @ApiOperation({
    summary: 'Search my todos',
    description:
      'Matches the keyword in the title, ignoring ASCII letter case.',
  })
  @ApiOkResponse({ type: [TodoResponseDto] })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Missing or empty keyword',
  })
  search(
    @CurrentUser() user: AuthUser,
    @Query() query: SearchTodoDto,
  ): Promise<TodoResponseDto[]> {
    return this.todosService.search(user.id, query.keyword);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of my todos' })
  @ApiOkResponse({ type: TodoResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Non-numeric id',
  })
  @ApiNotFoundResponse(NOT_FOUND)
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TodoResponseDto> {
    return this.todosService.findOne(user.id, id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update one of my todos',
    description: 'Partial update: omitted fields keep their values.',
  })
  @ApiOkResponse({ type: TodoResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse(NOT_FOUND)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTodoDto,
  ): Promise<TodoResponseDto> {
    return this.todosService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one of my todos' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Non-numeric id',
  })
  @ApiNotFoundResponse(NOT_FOUND)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.todosService.remove(user.id, id);
  }
}
