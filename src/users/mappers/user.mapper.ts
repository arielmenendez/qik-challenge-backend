import { plainToInstance } from 'class-transformer';
import { User } from '../entities/user.entity';
import { PublicUserDto } from '../dto/public-user.dto';

export function toPublicUserDto(user: User): PublicUserDto {
  return plainToInstance(PublicUserDto, user, {
    excludeExtraneousValues: true,
  });
}
