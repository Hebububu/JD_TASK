import { IsString, MinLength } from 'class-validator';

/** Only the password can change; `id` is the primary key and token subject. */
export class UpdateUserDto {
  @IsString()
  @MinLength(8)
  password: string;
}
