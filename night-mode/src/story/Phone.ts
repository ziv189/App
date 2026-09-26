import type { PhoneApp, PhoneMessage, PhoneProfile, PhoneThread } from '../ui/Ui';
import { BOOKING_HTML, HOST_THREAD, JORDAN_THREAD } from './content';

/** Alex's phone (and, later, Jordan's): message threads, the SitterSafe booking page, the clock. */
export class PhoneSystem {
  time = '8:02';
  battery = 64;
  bookingHtml = BOOKING_HTML;
  readonly threads: Record<string, PhoneThread> = {
    host: { id: 'host', name: 'Dana H. · SitterSafe', icon: { letter: 'D', color: '#6b4fd8' }, messages: [...HOST_THREAD], unread: 0 },
  };
  readonly jordan: PhoneThread = {
    id: 'sam',
    name: 'Sam',
    icon: { letter: 'S', color: '#2b8a6e' },
    messages: [...JORDAN_THREAD],
    unread: 3,
  };
  /** Called when the player opens an app (the story listens for "has read X"). */
  onOpen: ((owner: 'alex' | 'jordan', id: string) => void) | null = null;
  bookingSeen = 0;

  receive(thread: string, messages: PhoneMessage[]): void {
    const t = this.threads[thread];
    if (!t) return;
    t.messages.push(...messages);
    t.unread += messages.length;
  }

  get unread(): number {
    return Object.values(this.threads).reduce((n, t) => n + t.unread, 0);
  }

  alex(): PhoneProfile {
    return {
      owner: 'Alex',
      time: this.time,
      battery: `${this.battery}%`,
      apps: () => {
        const apps: PhoneApp[] = Object.values(this.threads).map((t) => ({
          kind: 'thread',
          id: t.id,
          name: t.name,
          preview: t.messages[t.messages.length - 1]?.text ?? '',
          icon: t.icon,
          badge: t.unread,
        }));
        apps.push({
          kind: 'page',
          id: 'booking',
          name: 'SitterSafe · My booking',
          preview: 'Hale House · Tonight 8 PM – 7 AM',
          icon: { letter: 'S', color: '#8a5cf6' },
          html: this.bookingHtml,
        });
        return apps;
      },
      thread: (id) => this.threads[id],
      onOpen: (id) => {
        const t = this.threads[id];
        if (t) t.unread = 0;
        if (id === 'booking') this.bookingSeen++;
        this.onOpen?.('alex', id);
      },
    };
  }

  jordanPhone(): PhoneProfile {
    return {
      owner: "Jordan's phone",
      time: '1:28',
      battery: '9%',
      apps: () => [
        {
          kind: 'thread',
          id: 'sam',
          name: 'Sam',
          preview: this.jordan.messages[this.jordan.messages.length - 1]!.text,
          icon: this.jordan.icon,
          badge: this.jordan.unread,
        },
      ],
      thread: (id) => (id === 'sam' ? this.jordan : undefined),
      onOpen: (id) => {
        if (id === 'sam') this.jordan.unread = 0;
        this.onOpen?.('jordan', id);
      },
    };
  }
}
