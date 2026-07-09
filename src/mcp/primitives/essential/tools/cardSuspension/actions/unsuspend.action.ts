import { AnkiConnectClient } from "@/mcp/clients/anki-connect.client";

/**
 * Parameters for unsuspend action
 */
export interface UnsuspendParams {
  /** Array of card IDs to unsuspend */
  cards: number[];
}

/**
 * Result of unsuspend action
 */
export interface UnsuspendResult {
  success: boolean;
  message: string;
  cardsAffected: number;
}

/**
 * Unsuspend specified cards, returning them to the review queue
 *
 * @see https://git.sr.ht/~foosoft/anki-connect#unsuspend
 */
export async function unsuspend(
  params: UnsuspendParams,
  client: AnkiConnectClient,
): Promise<UnsuspendResult> {
  const { cards } = params;

  if (!cards || cards.length === 0) {
    throw new Error("cards array cannot be empty");
  }

  await client.invoke<boolean>("unsuspend", { cards });

  return {
    success: true,
    message: `Successfully unsuspended ${cards.length} card(s)`,
    cardsAffected: cards.length,
  };
}
