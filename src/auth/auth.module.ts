import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { SecurityModule } from 'src/common/security/security.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'src/common/auth/strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    SecurityModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN');

        if (!secret) throw new Error('JWT_SECRET is not defined');
        if (!expiresIn) throw new Error('JWT_EXPIRES_IN is not defined');

        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as StringValue,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
