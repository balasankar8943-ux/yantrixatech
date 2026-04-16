'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getClients() {
  return await prisma.client.findMany({
    include: {
      invoices: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getClientById(id) {
  return await prisma.client.findUnique({
    where: { id },
    include: { invoices: true }
  });
}

export async function createClient(formData) {
  const newClient = await prisma.client.create({
    data: {
      name: formData.get('name'),
      industry: formData.get('industry'),
      status: formData.get('status') || 'ACTIVE',
      creditLimit: parseFloat(formData.get('creditLimit')) || 0,
    }
  });
  revalidatePath('/clients');
  revalidatePath('/');
  return newClient;
}

export async function updateClient(id, data) {
  const updatedClient = await prisma.client.update({
    where: { id },
    data
  });
  revalidatePath('/clients');
  revalidatePath('/');
  return updatedClient;
}

export async function deleteClient(id) {
  await prisma.client.delete({
    where: { id }
  });
  revalidatePath('/clients');
  revalidatePath('/');
}

// For manual testing setup
export async function addProjectCost(clientId, costAmount, description) {
  const cost = await prisma.projectCost.create({
    data: {
      clientId,
      costAmount: parseFloat(costAmount),
      description
    }
  });
  revalidatePath('/');
  return cost;
}

export async function getClientCosts(clientId) {
  return await prisma.projectCost.findMany({
    where: { clientId }
  });
}
