import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            save: jest.fn(),
            findOneBy: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should save and return the created user', async () => {
      const dto = {
        name: 'John',
        email: 'john@mail.com',
        password: 'hashed',
      };

      const savedUser = { id: 'user-1', ...dto };

      userRepository.save.mockResolvedValue(savedUser as User);

      const result = await service.create(dto as any);

      expect(userRepository.save).toHaveBeenCalledWith(dto);
      expect(result).toEqual(savedUser);
    });
  });

  describe('findOneByEmail', () => {
    it('should return user if found', async () => {
      const email = 'john@mail.com';
      const user = { id: 'user-1', email };

      userRepository.findOneBy.mockResolvedValue(user as User);

      const result = await service.findOneByEmail(email);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ email });
      expect(result).toEqual(user);
    });

    it('should return null if user is not found', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findOneByEmail('no@mail.com');

      expect(result).toBeNull();
    });
  });
});
