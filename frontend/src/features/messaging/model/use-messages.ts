import { useAuth } from "@/entities/user";
import { userChatClient } from "@/entities/message";
import { useIsDesktop } from "@/shared/hooks/use-desktop";
import { useMessagesModel } from "./use-messages-model";

export function useMessages() {
  const { user, isAdmin, isOnlineAuthenticated } = useAuth();
  const isDesktop = useIsDesktop();

  return useMessagesModel({
    auth: { user, isAdmin, isOnlineAuthenticated },
    isDesktop: Boolean(isDesktop),
    client: userChatClient,
  });
}
