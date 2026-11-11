import { m as motion } from "framer-motion";

interface ChatBubbleProps {
  text: string;
  mine: boolean;
}

export default function ChatBubble({ text, mine }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "backOut" }}
      className={`max-w-[80%] ${mine ? 'ml-auto' : 'mr-auto'}`}
    >
      <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium ${
        mine
          ? 'bg-primary/20 border border-primary/30 text-white rounded-br-md'
          : 'bg-white/[0.06] border border-white/[0.08] text-white/80 rounded-bl-md'
      }`}>
        {text}
      </div>
    </motion.div>
  );
}
