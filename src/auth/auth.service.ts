import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from 'src/common/security/password.service';
import { JwtService } from '@nestjs/jwt';
import { toPublicUserDto } from 'src/users/mappers/user.mapper';
import { PublicUserDto } from 'src/users/dto/public-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register({ name, email, password }: RegisterDto) {
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser =
      await this.usersService.findOneByEmail(normalizedEmail);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await this.passwordService.hash(password);

    const user = await this.usersService.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    return toPublicUserDto(user);
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; user: PublicUserDto }> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.usersService.findOneByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await this.passwordService.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: toPublicUserDto(user),
    };
  }
}
