import { z } from 'zod';
import { ClaimStatus } from '../../generated/prisma/enums.js';
import { pageQuery } from '../../common/pagination/page.js';
import { idSchema } from '../../common/validate.js';

export const questParams = z.object({ id: idSchema });
export const claimParams = z.object({ id: idSchema, claimId: idSchema });

export const decideClaimSchema = z.strictObject({
  status: z.enum(['approved', 'rejected']),
});

export const listClaimsQuery = z.object({
  ...pageQuery,
  status: z.enum(ClaimStatus).optional(),
});

export type DecideClaimInput = z.infer<typeof decideClaimSchema>;
export type ListClaimsQuery = z.infer<typeof listClaimsQuery>;
