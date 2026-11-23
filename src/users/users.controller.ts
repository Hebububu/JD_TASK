import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AccessTokenDto, UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

const VALIDATION_FAILED = {
  type: ErrorResponseDto,
  description: 'Validation failed',
};

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Create an account' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse(VALIDATION_FAILED)
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'User id already taken',
  })
  signup(@Body() dto: SignupDto): Promise<UserResponseDto> {
    return this.usersService.signup(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in and get an access token' })
  @ApiOkResponse({ type: AccessTokenDto })
  @ApiBadRequestResponse(VALIDATION_FAILED)
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Invalid id or password',
  })
  login(@Body() dto: LoginDto): Promise<AccessTokenDto> {
    return this.usersService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  getMe(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return this.usersService.findById(user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change the current user password',
    description: 'The user id is fixed; only the password can change.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse(VALIDATION_FAILED)
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updatePassword(user.id, dto.password);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete the current user',
    description: "Also deletes all of the user's todos.",
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  deleteMe(@CurrentUser() user: AuthUser): Promise<void> {
    return this.usersService.remove(user.id);
  }
}
