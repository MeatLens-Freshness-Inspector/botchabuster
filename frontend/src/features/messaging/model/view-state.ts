type ContactIdentity = {
  id: string;
};

export function resolveSelectedContactId(
  contacts: readonly ContactIdentity[],
  currentId: string | null,
  isDesktop: boolean,
): string | null {
  if (currentId && contacts.some((contact) => contact.id === currentId)) {
    return currentId;
  }

  if (!isDesktop) {
    return null;
  }

  return contacts[0]?.id ?? null;
}
