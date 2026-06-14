export interface Ticket {
  id: string;
  userId: string;
  username: string;
  subject: string;
  description: string;
  channelId: string;
  createdAt: Date;
  open: boolean;
}

/**
 * Manages support tickets.
 * In a real bot, swap the Map for a Prisma/database call.
 */
export class TicketManager {
  private tickets = new Map<string, Ticket>();
  private counter = 0;

  create(userId: string, username: string, subject: string, description: string, channelId: string): Ticket {
    const id = `TKT-${String(++this.counter).padStart(4, '0')}`;
    const ticket: Ticket = { id, userId, username, subject, description, channelId, createdAt: new Date(), open: true };
    this.tickets.set(id, ticket);
    return ticket;
  }

  close(id: string): boolean {
    const ticket = this.tickets.get(id);
    if (!ticket || !ticket.open) return false;
    ticket.open = false;
    return true;
  }

  getAll(): Ticket[] {
    return Array.from(this.tickets.values());
  }

  getOpen(): Ticket[] {
    return this.getAll().filter(t => t.open);
  }

  getById(id: string): Ticket | undefined {
    return this.tickets.get(id);
  }

  search(query: string): Ticket[] {
    const q = query.toLowerCase();
    return this.getAll().filter(
      t => t.id.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q),
    );
  }
}
