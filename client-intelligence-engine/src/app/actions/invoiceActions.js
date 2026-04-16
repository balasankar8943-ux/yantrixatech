'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getInvoices() {
  return await prisma.invoice.findMany({
    include: { client: true },
    orderBy: { dueDate: 'asc' },
  });
}

export async function createInvoice(formData) {
  const newInvoice = await prisma.invoice.create({
    data: {
      clientId: formData.get('clientId'),
      amount: parseFloat(formData.get('amount')),
      dueDate: new Date(formData.get('dueDate')),
      status: formData.get('status') || 'UNPAID',
    }
  });
  revalidatePath('/invoices');
  revalidatePath('/clients');
  revalidatePath('/');
  return newInvoice;
}

export async function markInvoicePaid(id) {
  const updatedInvoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: 'PAID',
      paidAt: new Date()
    }
  });
  revalidatePath('/invoices');
  revalidatePath('/clients');
  revalidatePath('/');
  return updatedInvoice;
}

export async function updateOverdueInvoices() {
  // Finds unpaid invoices with a past due date and flags them
  const now = new Date();
  await prisma.invoice.updateMany({
    where: {
      status: 'UNPAID',
      dueDate: { lt: now }
    },
    data: {
      status: 'OVERDUE'
    }
  });
  revalidatePath('/invoices');
  revalidatePath('/');
}
