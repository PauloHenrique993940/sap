import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const datasourceUrl = process.env.DATABASE_URL;

if (!datasourceUrl) {
	throw new Error('DATABASE_URL nao definida. Crie o arquivo .env na raiz com a conexao do PostgreSQL.');
}

const adapter = new PrismaPg({
	connectionString: datasourceUrl,
});

export const prisma = new PrismaClient({ adapter });
