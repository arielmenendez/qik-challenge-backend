import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and return result', async () => {
      const dto = {
        name: 'John',
        email: 'john@mail.com',
        password: '123456',
      };

      const serviceResponse = {
        id: 'user-id',
        name: dto.name,
        email: dto.email,
      };

      authService.register.mockResolvedValue(serviceResponse as any);

      const result = await controller.register(dto as any);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(serviceResponse);
    });
  });

  describe('login', () => {
    it('should call authService.login with email and password', async () => {
      const dto = {
        email: 'john@mail.com',
        password: '123456',
      };

      const serviceResponse = {
        access_token: 'jwt-token',
        user: { id: '1', email: dto.email, name: 'John' },
      };

      authService.login.mockResolvedValue(serviceResponse as any);

      const result = await controller.login(dto as any);

      expect(authService.login).toHaveBeenCalledWith(dto.email, dto.password);
      expect(result).toEqual(serviceResponse);
    });
  });

  describe('profile', () => {
    it('should return the user name', () => {
      const mockUser = {
        id: '1',
        name: 'John',
        email: 'john@mail.com',
        role: 'USER',
      };

      const result = controller.profile(mockUser as any);

      expect(result).toEqual({ name: 'John' });
    });
  });
});
