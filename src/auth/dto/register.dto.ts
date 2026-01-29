import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Ariel' })
  @Transform(({ value }) => value.trim())
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'ariel@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @Transform(({ value }) => value.trim())
  @IsString()
  @MinLength(6)
  password: string;
}
