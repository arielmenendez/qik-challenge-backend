import { Expose } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';

export class PublicUserDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  role: UserRole;
}
