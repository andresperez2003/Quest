import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/errors.js';

const router = Router();

const fields = {
  name: z.string().trim().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
  icon: z.string().trim().min(1).max(30), // nombre de ícono de Lucide (o emoji en datos antiguos)
};
const createSchema = z.object(fields);
const updateSchema = z.object(fields).partial();

async function findCategory(userId, id) {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) throw new HttpError(404, 'Categoría no encontrada');
  return category;
}

function rethrowDuplicate(err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new HttpError(409, 'Ya tienes una categoría con ese nombre');
  }
  throw err;
}

router.get('/', async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { userId: req.userId },
    orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: {
          tasks: { where: { status: 'pending' } },
          habits: { where: { archived: false } },
        },
      },
    },
  });
  res.json({ categories });
});

router.post('/', async (req, res) => {
  const data = createSchema.parse(req.body);
  const category = await prisma.category.create({ data: { ...data, userId: req.userId } }).catch(rethrowDuplicate);
  res.status(201).json({ category });
});

router.patch('/:id', async (req, res) => {
  const current = await findCategory(req.userId, req.params.id);
  const data = updateSchema.parse(req.body);
  const category = await prisma.category.update({ where: { id: current.id }, data }).catch(rethrowDuplicate);
  res.json({ category });
});

// Las tareas y hábitos de la categoría quedan sin categoría (onDelete: SetNull), no se borran.
router.delete('/:id', async (req, res) => {
  const current = await findCategory(req.userId, req.params.id);
  await prisma.category.delete({ where: { id: current.id } });
  res.status(204).end();
});

export default router;
