import { Theme } from 'datocms-plugin-sdk';
import { motion } from 'framer-motion';

type Bubble = {
  fieldLabel: string;
  status: 'pending' | 'done';
  fieldPath: string;
};

type Props = {
  index: number;
  bubble: Bubble;
  theme: Theme;
};

export function ChatBubbleGenerate({ index, bubble, theme }: Props) {
  const bgColor = bubble.status === 'done' ? '#d4edda' : '#fff3cd';
  const borderColor = bubble.status === 'done' ? '#c3e6cb' : '#ffeeba';
  const textColor = bubble.status === 'done' ? '#155724' : '#856404';

  const message =
    bubble.status === 'pending'
      ? `Generating field: ${bubble.fieldLabel}...`
      : `Done generating: ${bubble.fieldLabel}`;

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        padding: '8px 12px',
        borderRadius: '8px',
        marginBottom: '8px',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        fontSize: '14px',
      }}
    >
      {message}
    </motion.div>
  );
}
