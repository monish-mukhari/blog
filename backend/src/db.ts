import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

export const createDatabase = (url: string) =>
  new PrismaClient({ datasourceUrl: url }).$extends(withAccelerate());

export type Database = ReturnType<typeof createDatabase>;
