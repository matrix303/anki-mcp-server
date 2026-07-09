import { AnkiConnectClient } from "@/mcp/clients/anki-connect.client";

/**
 * Parameters for suspend action
 */
export interface SuspendParams {
  /** Array of card IDs to suspend */
  cards: number[];
}

/**
 * Result of suspend action
 */
export interface SuspendResult {
  success: boolean;
  message: string;
  cardsAffected: number;
}

/**
 * Suspend specified cards, removing them from the review queue
 *
 * @see https://git.sr.ht/~foosoft/anki-connect#suspend
 */
export async function suspend(
  params: SuspendParams,
  client: AnkiConnectClient,
): Promise<SuspendResult> {
  const { cards } = params;

  if (!cards || cards.length === 0) {
    throw new Error("cards array cannot be empty");
  }

  await client.invoke<boolean>("suspend", { cards });

  return {
    success: true,
    message: `Successfully suspended ${cards.length} card(s)`,
    cardsAffected: cards.length,
  };
}
