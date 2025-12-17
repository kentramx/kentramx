import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupportChatbot } from "./SupportChatbot";

export const SupportChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 z-40 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90"
        size="icon"
        aria-label="Abrir chat de soporte"
      >
        <MessageCircleQuestion className="h-6 w-6" />
      </Button>

      {/* Chat Modal */}
      <SupportChatbot isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
