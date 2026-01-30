import { ExecutionContext } from '@nestjs/common';
import { GqlAuthGuard } from './gql-auth.guard';
import { GqlExecutionContext } from '@nestjs/graphql';

describe('GqlAuthGuard', () => {
  let guard: GqlAuthGuard;

  beforeEach(() => {
    guard = new GqlAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getRequest', () => {
    it('should extract req from GraphQL context', () => {
      const mockReq = { headers: { authorization: 'Bearer token' } };

      const mockGqlContext = {
        getContext: jest.fn().mockReturnValue({ req: mockReq }),
      };

      jest
        .spyOn(GqlExecutionContext, 'create')
        .mockReturnValue(mockGqlContext as any);

      const executionContext = {} as ExecutionContext;

      const result = guard.getRequest(executionContext);

      expect(GqlExecutionContext.create).toHaveBeenCalledWith(executionContext);
      expect(mockGqlContext.getContext).toHaveBeenCalled();
      expect(result).toBe(mockReq);
    });
  });
});
