import {
  ContextItem,
  ContextItemType,
  ContextFilter,
  ContextItemNotFoundError,
} from "../../context/types";
import { InMemoryContextRepository } from "../../context/context-repository";

describe("Context Management", () => {
  let repository: InMemoryContextRepository;

  beforeEach(() => {
    repository = new InMemoryContextRepository();
  });

  afterEach(async () => {
    await repository.clear();
  });

  describe("Context Repository", () => {
    it("should store and retrieve context items", async () => {
      const item: ContextItem = {
        id: "test-1",
        type: "audio_parameters",
        content: {
          sampleRate: 44100,
          channels: 2,
        },
        metadata: {
          timestamp: new Date(),
          source: "test",
          priority: 1,
        },
      };

      await repository.store(item);
      const retrieved = await repository.retrieve(item.id);

      expect(retrieved).toEqual(item);
    });

    it("should handle querying with filters", async () => {
      const items: ContextItem[] = [
        {
          id: "test-1",
          type: "audio_parameters",
          content: { sampleRate: 44100 },
          metadata: {
            timestamp: new Date(),
            source: "test-a",
            priority: 1,
          },
        },
        {
          id: "test-2",
          type: "processing_requirements",
          content: { quality: "high" },
          metadata: {
            timestamp: new Date(),
            source: "test-b",
            priority: 2,
          },
        },
      ];

      await Promise.all(items.map((item) => repository.store(item)));

      const filter: ContextFilter = {
        types: ["audio_parameters"],
        minPriority: 1,
      };

      const results = await repository.query(filter);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("test-1");
    });

    it("should handle updates to context items", async () => {
      const item: ContextItem = {
        id: "test-1",
        type: "audio_parameters",
        content: {
          sampleRate: 44100,
        },
        metadata: {
          timestamp: new Date(),
          source: "test",
          priority: 1,
        },
      };

      await repository.store(item);

      const updates: Partial<ContextItem> = {
        content: {
          sampleRate: 48000,
        },
        metadata: {
          timestamp: new Date(), // Keep the original timestamp
          source: "test", // Keep the original source
          priority: 2, // Update the priority
        },
      };

      await repository.update(item.id, updates);
      const updated = await repository.retrieve(item.id);

      expect(updated.content.sampleRate).toBe(48000);
      expect(updated.metadata.priority).toBe(2);
      expect(updated.metadata.source).toBe("test");
    });

    it("should handle TTL expiration", async () => {
      const item: ContextItem = {
        id: "test-1",
        type: "audio_parameters",
        content: {
          sampleRate: 44100,
        },
        metadata: {
          timestamp: new Date(Date.now() - 2000), // 2 seconds ago
          source: "test",
          priority: 1,
          ttl: 1000, // 1 second TTL
        },
      };

      await repository.store(item);

      await expect(repository.retrieve(item.id)).rejects.toThrow(
        ContextItemNotFoundError
      );
    });

    it("should handle deletion of context items", async () => {
      const item: ContextItem = {
        id: "test-1",
        type: "audio_parameters",
        content: {
          sampleRate: 44100,
        },
        metadata: {
          timestamp: new Date(),
          source: "test",
          priority: 1,
        },
      };

      await repository.store(item);
      await repository.delete(item.id);

      await expect(repository.retrieve(item.id)).rejects.toThrow(
        ContextItemNotFoundError
      );
    });

    it("should handle clearing all context items", async () => {
      const items: ContextItem[] = [
        {
          id: "test-1",
          type: "audio_parameters",
          content: { sampleRate: 44100 },
          metadata: {
            timestamp: new Date(),
            source: "test",
            priority: 1,
          },
        },
        {
          id: "test-2",
          type: "processing_requirements",
          content: { quality: "high" },
          metadata: {
            timestamp: new Date(),
            source: "test",
            priority: 1,
          },
        },
      ];

      await Promise.all(items.map((item) => repository.store(item)));
      await repository.clear();

      const results = await repository.query({});
      expect(results).toHaveLength(0);
    });
  });
});
