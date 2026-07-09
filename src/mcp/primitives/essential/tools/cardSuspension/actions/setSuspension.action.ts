import { AnkiConnectClient } from "@/mcp/clients/anki-connect.client";

/**
 * Parameters for setCardSuspension action
 */
export interface SetSuspensionParams {
  /** Array of card IDs to modify */
  cards: number[];

  /** true to suspend the cards, false to unsuspend them */
  suspended: boolean;
}

/**
 * Result of setCardSuspension action
 */
export interface SetSuspensionResult {
  success: boolean;
  message: string;
  /** true if AnkiConnect reports at least one card's state actually changed */
  changed: boolean;
  cardsAffected: number;
}

/**
 * Suspend or unsuspend specified cards
 *
 * @see https://git.sr.ht/~foosoft/anki-connect#suspend
 * @see https://git.sr.ht/~foosoft/anki-connect#unsuspend
 */
export async function setCardSuspension(
  params: SetSuspensionParams,
  client: AnkiConnectClient,
): Promise<SetSuspensionResult> {
  const { cards, suspended } = params;

  if (!cards || cards.length === 0) {
    throw new Error("cards array cannot be empty");
  }

  const action = suspended ? "suspend" : "unsuspend";
  const verb = suspended ? "suspended" : "unsuspended";

  // AnkiConnect returns false when none of the given cards actually
  // changed state (e.g. already suspended, or the ids don't exist) -
  // report that honestly instead of always claiming success.
  const changed = await client.invoke<boolean>(action, { cards });

  return {
    success: true,
    changed,
    cardsAffected: changed ? cards.length : 0,
    message: changed
      ? `Successfully ${verb} ${cards.length} card(s)`
      : `No cards were ${verb} - they may already be in that state, or the ids don't exist`,
  };
}
