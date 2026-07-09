import { Injectable, Logger } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";
import type { Context } from "@rekog/mcp-nest";
import { z } from "zod";
import { AnkiConnectClient } from "@/mcp/clients/anki-connect.client";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/mcp/utils/anki.utils";
import { suspend, type SuspendResult } from "./actions/suspend.action";
import { unsuspend, type UnsuspendResult } from "./actions/unsuspend.action";

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
- suspend: Remove specified cards from the review queue (cards: number[])
- unsuspend: Return specified cards to the review queue (cards: number[])

Operates on card IDs, not note IDs. Get card IDs for a note from notesInfo's "cards" field.`,
    parameters: z.object({
      action: z
        .enum(["suspend", "unsuspend"])
        .describe("The suspension action to perform"),
      cards: z
        .array(z.coerce.number())
        .min(1)
        .max(100)
        .describe(
          "Array of card IDs to modify (max 100 at once). Get these from notesInfo's cards field.",
        ),
    }),
  })
  async execute(
    params: {
      action: "suspend" | "unsuspend";
      cards: number[];
    },
    context: Context,
  ) {
    try {
      this.logger.log(`Executing card suspension action: ${params.action}`);

      let result: SuspendResult | UnsuspendResult;

      await context.reportProgress({ progress: 25, total: 100 });

      switch (params.action) {
        case "suspend":
          result = await suspend({ cards: params.cards }, this.ankiClient);
          break;

        case "unsuspend":
          result = await unsuspend({ cards: params.cards }, this.ankiClient);
          break;

        default: {
          // TypeScript exhaustiveness check
          const _exhaustive: never = params.action;
          throw new Error(`Unknown action: ${_exhaustive}`);
        }
      }

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
