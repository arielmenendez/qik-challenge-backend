import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: configService.getOrThrow('DATABASE_HOST'),
    port: Number(configService.getOrThrow('DATABASE_PORT')),
    username: configService.getOrThrow('DATABASE_USER'),
    password: configService.getOrThrow('DATABASE_PASSWORD'),
    database: configService.getOrThrow('DATABASE_NAME'),
    autoLoadEntities: true,
    synchronize: true,
  };
};
