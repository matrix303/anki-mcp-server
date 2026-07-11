import { Injectable, Logger } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";
import type { Context } from "@rekog/mcp-nest";
import { z } from "zod";
import { AnkiConnectClient } from "@/mcp/clients/anki-connect.client";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/mcp/utils/anki.utils";
import {
  setCardSuspension,
  type SetSuspensionResult,
} from "./actions/setSuspension.action";

/**
 * Unified card suspension tool for managing a card's review-queue membership
 * Supports: suspend, unsuspend
 *
 * Note: this operates on card IDs, not note IDs. Card IDs for a note are
 * returned by notesInfo (the `cards` field on each note).
 */
@Injectable()
export class CardSuspensionTool {
  private readonly logger = new Logger(CardSuspensionTool.name);

  constructor(private readonly ankiClient: AnkiConnectClient) {}

  @Tool({
    name: "cardSuspension",
    description: `Suspend or unsuspend Anki cards, controlling whether they appear in review. Supports two actions:
- suspend: Remove specified cards from the review queue (cards: number[], confirmSuspend: true). This pulls cards out of the user's live review queue - only call it if the user explicitly asked to suspend/pause/skip these cards. Requires confirmSuspend: true or the call is rejected.
- unsuspend: Return specified cards to the review queue (cards: number[])

Operates on card IDs, not note IDs. Get card IDs for a note from notesInfo's "cards" field.`,
    parameters: z.object({
      action: z
        .enum(["suspend", "unsuspend"])
        .describe("The suspension action to perform"),
      cards: z
        .array(z.coerce.number().int().positive())
        .min(1)
        .max(100)
        .describe(
          "Array of card IDs to modify (max 100 at once). Get these from notesInfo's cards field.",
        ),
      confirmSuspend: z
        .boolean()
        .optional()
        .describe(
          "[suspend only] Must be explicitly set to true to suspend cards - this removes them from the user's live review queue. Not required for unsuspend.",
        ),
    }),
  })
  async execute(
    params: {
      action: "suspend" | "unsuspend";
      cards: number[];
      confirmSuspend?: boolean;
    },
    context: Context,
  ) {
    try {
      this.logger.log(`Executing card suspension action: ${params.action}`);

      if (params.action === "suspend" && params.confirmSuspend !== true) {
        return createErrorResponse(new Error("Suspension not confirmed"), {
          requestedCards: params.cards,
          hint: "Set confirmSuspend to true to remove these cards from the review queue",
        });
      }

      await context.reportProgress({ progress: 25, total: 100 });

      const result: SetSuspensionResult = await setCardSuspension(
        { cards: params.cards, suspended: params.action === "suspend" },
        this.ankiClient,
      );

      await context.reportProgress({ progress: 100, total: 100 });

      this.logger.log(`Successfully executed ${params.action}`);
      return createSuccessResponse(result);
    } catch (error) {
      this.logger.error(`Failed to execute ${params.action}`, error);
      return createErrorResponse(error, {
        action: params.action,
        hint: "Make sure Anki is running and the card IDs are valid",
      });
    }
  }
}
