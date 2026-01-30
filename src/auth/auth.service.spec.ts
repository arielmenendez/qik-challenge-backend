import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { PasswordService } from 'src/common/security/password.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let passwordService: jest.Mocked<PasswordService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findOneByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            hash: jest.fn(),
            compare: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    passwordService = module.get(PasswordService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const dto = {
      name: 'John Doe',
      email: 'TEST@MAIL.COM ',
      password: '123456',
    };

    it('should register a new user successfully', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('hashedPassword');

      const createdUser = {
        id: 'user-id',
        name: dto.name,
        email: 'test@mail.com',
        password: 'hashedPassword',
        role: 'USER',
      };

      usersService.create.mockResolvedValue(createdUser as any);

      const result = await service.register(dto);

      expect(usersService.findOneByEmail).toHaveBeenCalledWith('test@mail.com');
      expect(passwordService.hash).toHaveBeenCalledWith(dto.password);
      expect(usersService.create).toHaveBeenCalledWith({
        name: dto.name,
        email: 'test@mail.com',
        password: 'hashedPassword',
      });

      expect(result).toMatchObject({
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw if user already exists', async () => {
      usersService.findOneByEmail.mockResolvedValue({ id: 'existing' } as any);

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(usersService.create).not.toHaveBeenCalled();
      expect(passwordService.hash).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const email = 'USER@MAIL.COM ';
    const password = 'plainPassword';

    const mockUser = {
      id: 'user-id',
      email: 'user@mail.com',
      password: 'hashedPassword',
      role: 'USER',
      name: 'John',
    };

    it('should login successfully and return token + user', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser as any);
      passwordService.compare.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.login(email, password);

      expect(usersService.findOneByEmail).toHaveBeenCalledWith('user@mail.com');
      expect(passwordService.compare).toHaveBeenCalledWith(
        password,
        mockUser.password,
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        role: mockUser.role,
      });

      expect(result).toEqual({
        access_token: 'jwt-token',
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        }),
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);

      await expect(service.login(email, password)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(passwordService.compare).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser as any);
      passwordService.compare.mockResolvedValue(false);

      await expect(service.login(email, password)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
