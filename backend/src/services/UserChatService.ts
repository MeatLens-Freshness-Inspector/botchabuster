import { supabase } from "../integrations/supabase";
import { profileService } from "./ProfileService";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ChatRole = "admin" | "user";

export interface UserChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
}

export interface UserChatContact {
  id: string;
  full_name: string | null;
  email: string | null;
  inspector_code: string | null;
  location: string | null;
  role: ChatRole;
  last_message_preview: string | null;
  last_message_at: string | null;
}

export class UserChatService {
  private static instance: UserChatService;

  private constructor() {}

  static getInstance(): UserChatService {
    if (!UserChatService.instance) {
      UserChatService.instance = new UserChatService();
    }
    return UserChatService.instance;
  }

  private assertUuid(value: string, fieldName: string): void {
    if (!UUID_REGEX.test(value)) {
      throw new Error(`${fieldName} must be a valid UUID`);
    }
  }

  private async getPrivilegedUserIdSet(): Promise<Set<string>> {
    const { data, error } = await supabase.from("user_roles").select("user_id, role");
    if (error) throw new Error(`Failed to fetch user roles: ${error.message}`);

    const privilegedIds = new Set<string>();
    for (const row of data ?? []) {
      if ((row.role === "admin" || row.role === "developer") && typeof row.user_id === "string") {
        privilegedIds.add(row.user_id);
      }
    }

    return privilegedIds;
  }

  async getActorRole(userId: string): Promise<ChatRole> {
    this.assertUuid(userId, "userId");
    const privilege = await profileService.getPrivilegeSummary(userId);
    return privilege.isAdmin ? "admin" : "user";
  }

  async listContactsForActor(actorId: string): Promise<UserChatContact[]> {
    this.assertUuid(actorId, "actorId");

    const actorRole = await this.getActorRole(actorId);
    const privilegedIds = await this.getPrivilegedUserIdSet();
    const allProfiles = await profileService.getAllProfiles();

    const allowedContacts = allProfiles
      .filter((profile) => profile.id !== actorId)
      .filter((profile) => {
        const profileIsPrivileged = privilegedIds.has(profile.id);
        return actorRole === "admin" ? !profileIsPrivileged : profileIsPrivileged;
      });

    if (allowedContacts.length === 0) {
      return [];
    }

    const contactIdSet = new Set(allowedContacts.map((profile) => profile.id));
    const { data: latestMessagesRaw, error: latestMessagesError } = await supabase
      .from("user_chat_messages")
      .select("sender_id, recipient_id, content, created_at")
      .or(`sender_id.eq.${actorId},recipient_id.eq.${actorId}`)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (latestMessagesError) {
      throw new Error(`Failed to fetch latest chat messages: ${latestMessagesError.message}`);
    }

    const latestMessageByContactId = new Map<
      string,
      { content: string; createdAt: string }
    >();

    for (const row of latestMessagesRaw ?? []) {
      const senderId = row.sender_id as string;
      const recipientId = row.recipient_id as string;
      const counterpartId = senderId === actorId ? recipientId : senderId;

      if (!contactIdSet.has(counterpartId)) continue;
      if (latestMessageByContactId.has(counterpartId)) continue;

      latestMessageByContactId.set(counterpartId, {
        content: String(row.content ?? ""),
        createdAt: String(row.created_at ?? ""),
      });
    }

    return allowedContacts
      .map((profile) => {
        const latest = latestMessageByContactId.get(profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email ?? null,
          inspector_code: profile.inspector_code,
          location: profile.location,
          role: privilegedIds.has(profile.id) ? "admin" : "user",
          last_message_preview: latest?.content ?? null,
          last_message_at: latest?.createdAt ?? null,
        } satisfies UserChatContact;
      })
      .sort((left, right) => {
        const leftTime = left.last_message_at ? new Date(left.last_message_at).getTime() : 0;
        const rightTime = right.last_message_at ? new Date(right.last_message_at).getTime() : 0;
        if (leftTime !== rightTime) return rightTime - leftTime;

        const leftName = left.full_name?.trim() || left.email?.trim() || left.id;
        const rightName = right.full_name?.trim() || right.email?.trim() || right.id;
        return leftName.localeCompare(rightName);
      });
  }

  private async assertConversationAllowed(actorId: string, counterpartId: string): Promise<void> {
    this.assertUuid(actorId, "actorId");
    this.assertUuid(counterpartId, "counterpartyId");

    if (actorId === counterpartId) {
      throw new Error("Self-chat is not allowed");
    }

    const [actorRole, counterpartProfile, counterpartPrivilege] = await Promise.all([
      this.getActorRole(actorId),
      profileService.getProfile(counterpartId),
      profileService.getPrivilegeSummary(counterpartId),
    ]);

    if (!counterpartProfile) {
      throw new Error("Counterparty account was not found");
    }

    if (actorRole === "admin" && counterpartPrivilege.isAdmin) {
      throw new Error("Admins can only chat with users");
    }

    if (actorRole === "user" && !counterpartPrivilege.isAdmin) {
      throw new Error("Users can only chat with admins");
    }
  }

  async listConversation(
    actorId: string,
    counterpartId: string,
    options: { limit?: number } = {}
  ): Promise<UserChatMessage[]> {
    await this.assertConversationAllowed(actorId, counterpartId);

    const limit = Math.max(1, Math.min(options.limit ?? 250, 500));
    const { data, error } = await supabase
      .from("user_chat_messages")
      .select("id, sender_id, recipient_id, content, created_at")
      .or(
        `and(sender_id.eq.${actorId},recipient_id.eq.${counterpartId}),and(sender_id.eq.${counterpartId},recipient_id.eq.${actorId})`
      )
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch chat conversation: ${error.message}`);
    return (data as UserChatMessage[]) ?? [];
  }

  async sendMessage(
    actorId: string,
    recipientId: string,
    content: string
  ): Promise<UserChatMessage> {
    await this.assertConversationAllowed(actorId, recipientId);

    const normalizedContent = content.trim();
    if (normalizedContent.length < 1) {
      throw new Error("Message content is required");
    }
    if (normalizedContent.length > 2000) {
      throw new Error("Message must be 2000 characters or less");
    }

    const { data, error } = await (supabase.from("user_chat_messages") as any)
      .insert({
        sender_id: actorId,
        recipient_id: recipientId,
        content: normalizedContent,
      })
      .select("id, sender_id, recipient_id, content, created_at")
      .single();

    if (error) throw new Error(`Failed to send chat message: ${error.message}`);
    return data as UserChatMessage;
  }
}

export const userChatService = UserChatService.getInstance();
