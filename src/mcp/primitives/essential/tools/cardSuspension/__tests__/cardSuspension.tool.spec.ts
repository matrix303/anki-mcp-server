import { Test, TestingModule } from "@nestjs/testing";
import { CardSuspensionTool } from "../cardSuspension.tool";
import { AnkiConnectClient } from "@/mcp/clients/anki-connect.client";
import {
  parseToolResult,
  createMockContext,
} from "@/test-fixtures/test-helpers";

// Mock the AnkiConnectClient
jest.mock("@/mcp/clients/anki-connect.client");

describe("CardSuspensionTool", () => {
  let tool: CardSuspensionTool;
  let ankiClient: jest.Mocked<AnkiConnectClient>;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CardSuspensionTool, AnkiConnectClient],
    }).compile();

    tool = module.get<CardSuspensionTool>(CardSuspensionTool);
    ankiClient = module.get(
      AnkiConnectClient,
    ) as jest.Mocked<AnkiConnectClient>;

    mockContext = createMockContext();

    jest.clearAllMocks();
  });

  describe("suspend action", () => {
    it("should suspend specified cards when confirmed", async () => {
      const params = {
        action: "suspend" as const,
        cards: [1234567890, 1234567891],
        confirmSuspend: true,
      };
      ankiClient.invoke.mockResolvedValueOnce(true);

      const rawResult = await tool.execute(params, mockContext);
      const result = parseToolResult(rawResult);

      expect(ankiClient.invoke).toHaveBeenCalledWith("suspend", {
        cards: [1234567890, 1234567891],
      });
      expect(result.success).toBe(true);
      expect(result.changed).toBe(true);
      expect(result.cardsAffected).toBe(2);
    });

    it("should reject suspend without confirmSuspend", async () => {
      const params = {
        action: "suspend" as const,
        cards: [1234567890],
      };

      const rawResult = await tool.execute(params, mockContext);
      const result = parseToolResult(rawResult);

      expect(ankiClient.invoke).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain("Suspension not confirmed");
    });

    it("should reject suspend when confirmSuspend is false", async () => {
      const params = {
        action: "suspend" as const,
        cards: [1234567890],
        confirmSuspend: false,
      };

      const rawResult = await tool.execute(params, mockContext);
      const result = parseToolResult(rawResult);

      expect(ankiClient.invoke).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain("Suspension not confirmed");
    });
  });

  describe("unsuspend action", () => {
    it("should unsuspend specified cards without requiring confirmation", async () => {
      const params = {
        action: "unsuspend" as const,
        cards: [1234567890],
      };
      ankiClient.invoke.mockResolvedValueOnce(true);

      const rawResult = await tool.execute(params, mockContext);
      const result = parseToolResult(rawResult);

      expect(ankiClient.invoke).toHaveBeenCalledWith("unsuspend", {
        cards: [1234567890],
      });
      expect(result.success).toBe(true);
      expect(result.changed).toBe(true);
      expect(result.cardsAffected).toBe(1);
    });

    it("should report changed:false and cardsAffected:0 when AnkiConnect reports no state change", async () => {
      const params = {
        action: "unsuspend" as const,
        cards: [1234567890],
      };
      ankiClient.invoke.mockResolvedValueOnce(false);

      const rawResult = await tool.execute(params, mockContext);
      const result = parseToolResult(rawResult);

      expect(result.success).toBe(true);
      expect(result.changed).toBe(false);
      expect(result.cardsAffected).toBe(0);
      expect(result.message).toContain("No cards were unsuspended");
    });
  });

  describe("error handling", () => {
    it("should handle network errors", async () => {
      const params = {
        action: "unsuspend" as const,
        cards: [1234567890],
      };
      ankiClient.invoke.mockRejectedValueOnce(new Error("Network error"));

      const rawResult = await tool.execute(params, mockContext);
      const result = parseToolResult(rawResult);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });
  });

  describe("progress reporting", () => {
    it("should report progress for unsuspend", async () => {
      const params = {
        action: "unsuspend" as const,
        cards: [1234567890],
      };
      ankiClient.invoke.mockResolvedValueOnce(true);

      await tool.execute(params, mockContext);

      expect(mockContext.reportProgress).toHaveBeenCalledWith({
        progress: 25,
        total: 100,
      });
      expect(mockContext.reportProgress).toHaveBeenCalledWith({
        progress: 100,
        total: 100,
      });
    });

    it("should not report progress when suspend is rejected for missing confirmation", async () => {
      const params = {
        action: "suspend" as const,
        cards: [1234567890],
      };

      await tool.execute(params, mockContext);

      expect(mockContext.reportProgress).not.toHaveBeenCalled();
    });
  });
});
