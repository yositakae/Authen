require('dotenv').config();

const cors = require('cors');
const express = require('express');
const prisma = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/types', async (_req, res, next) => {
  try {
    const types = await prisma.type.findMany({ orderBy: { typeId: 'asc' } });
    res.json(types);
  } catch (error) {
    next(error);
  }
});

app.post('/api/types', async (req, res, next) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const type = await prisma.type.create({ data: { name } });
    res.status(201).json(type);
  } catch (error) {
    next(error);
  }
});

app.put('/api/types/:typeId', async (req, res, next) => {
  const typeId = Number(req.params.typeId);
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!Number.isInteger(typeId) || typeId < 1 || !name) {
    return res.status(400).json({ error: 'A valid typeId and name are required' });
  }
  try {
    const type = await prisma.type.update({ where: { typeId }, data: { name } });
    res.json(type);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/types/:typeId', async (req, res, next) => {
  const typeId = Number(req.params.typeId);
  if (!Number.isInteger(typeId) || typeId < 1) return res.status(400).json({ error: 'Invalid typeId' });
  try {
    await prisma.type.delete({ where: { typeId } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/menus', async (_req, res, next) => {
  try {
    const menus = await prisma.menu.findMany({
      include: { type: { select: { typeId: true, name: true } } },
      orderBy: { menuId: 'asc' },
    });
    res.json(menus.map((menu) => ({ ...menu, price: Number(menu.price) })));
  } catch (error) {
    next(error);
  }
});

app.post('/api/menus', async (req, res, next) => {
  const { name, price, isBestSeller = false, typeId } = req.body;
  const numericPrice = Number(price);
  const numericTypeId = Number(typeId);
  if (typeof name !== 'string' || !name.trim() || !Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isInteger(numericTypeId) || numericTypeId < 1 || typeof isBestSeller !== 'boolean') {
    return res.status(400).json({ error: 'name, non-negative price, boolean isBestSeller, and typeId are required' });
  }
  try {
    const menu = await prisma.menu.create({
      data: { name: name.trim(), price: numericPrice, isBestSeller, typeId: numericTypeId },
      include: { type: { select: { typeId: true, name: true } } },
    });
    res.status(201).json({ ...menu, price: Number(menu.price) });
  } catch (error) {
    next(error);
  }
});

app.put('/api/menus/:menuId', async (req, res, next) => {
  const menuId = Number(req.params.menuId);
  const { name, price, isBestSeller, typeId } = req.body;
  const numericPrice = Number(price);
  const numericTypeId = Number(typeId);
  if (!Number.isInteger(menuId) || menuId < 1 || typeof name !== 'string' || !name.trim() || !Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isInteger(numericTypeId) || numericTypeId < 1 || typeof isBestSeller !== 'boolean') {
    return res.status(400).json({ error: 'Valid menu fields are required' });
  }
  try {
    const menu = await prisma.menu.update({
      where: { menuId },
      data: { name: name.trim(), price: numericPrice, isBestSeller, typeId: numericTypeId },
      include: { type: { select: { typeId: true, name: true } } },
    });
    res.json({ ...menu, price: Number(menu.price) });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/menus/:menuId', async (req, res, next) => {
  const menuId = Number(req.params.menuId);
  if (!Number.isInteger(menuId) || menuId < 1) return res.status(400).json({ error: 'Invalid menuId' });
  try {
    await prisma.menu.delete({ where: { menuId } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.code === 'P2003') {
    return res.status(409).json({ error: 'The type is in use or the selected typeId does not exist' });
  }
  if (error.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
  if (error.code === 'P2002') return res.status(409).json({ error: 'A record with this value already exists' });
  if (error.code === 'P1001' || error.code === 'P1003') {
    return res.status(503).json({ error: 'Database unavailable; check the MySQL service and environment settings' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API server listening on port ${port}`));
