import { Injectable } from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class PasswordService {
  private readonly saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

  hash(plain: string): Promise<string> {
    return bcryptjs.hash(plain, this.saltRounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(plain, hash);
  }
}
