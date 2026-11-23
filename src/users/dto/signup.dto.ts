import { IsString, Length, Matches, MinLength } from 'class-validator';

export class SignupDto {
  /** Login id chosen by the user. Fixed after signup. */
  @IsString()
  @Length(4, 20)
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'id may only contain letters, numbers and underscores',
  })
  id: string;

  @IsString()
  @MinLength(8)
  password: string;
}
