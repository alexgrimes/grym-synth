export class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }>;

  constructor() {
    this.items = [];
  }

  enqueue(item: T, priority: number): void {
    const element = { item, priority };
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (element.priority > this.items[i].priority) {
        this.items.splice(i, 0, element);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(element);
    }
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items.shift()?.item;
  }

  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items[0].item;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }

  find(predicate: (item: T) => boolean): T | undefined {
    const found = this.items.find(({ item }) => predicate(item));
    return found?.item;
  }

  remove(predicate: (item: T) => boolean): boolean {
    const initialLength = this.items.length;
    this.items = this.items.filter(({ item }) => !predicate(item));
    return this.items.length !== initialLength;
  }

  toArray(): T[] {
    return this.items.map(({ item }) => item);
  }
}
