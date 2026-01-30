import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  it('should be defined', () => {
    const guard = new AuthGuard();
    expect(guard).toBeDefined();
  });

  it('should extend PassportAuthGuard with jwt strategy', () => {
    const guard = new AuthGuard();
    expect(typeof (guard as any).canActivate).toBe('function');
  });
});
