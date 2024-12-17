import React from 'react';
import { motion, useAnimation } from 'framer-motion';
import locale from 'locale-codes';
import { AiOutlineOpenAI } from 'react-icons/ai';

type Bubble = {
  status: 'pending' | 'done';
  fieldLabel: string;
  locale: string;
};

type Props = {
  index: number;
  bubble: Bubble;
};

export const ChatBubble: React.FC<Props> = ({ index, bubble }) => {
  const isPending = bubble.status === 'pending';
  const localeSelect = locale.getByTag;
  const controls = useAnimation();

  React.useEffect(() => {
    if (isPending) {
      controls.start({
        rotate: [0, 360],
        transition: {
          rotate: {
            duration: 2,
            ease: 'linear',
            repeat: Infinity,
          },
        },
      });
    } else {
      controls.stop();
    }
  }, [isPending, controls]);

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0.0, 0.2, 1], 
      }}
      style={{
        background: isPending ? '#f5f5f5' : '#f0f9f6',
        borderRadius: '12px',
        padding: '10px 14px',
        fontSize: '14px',
        color: isPending ? '#666' : '#2d7a66',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        margin: '12px 0',
        alignSelf: isPending ? 'flex-start' : 'flex-end',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        border: `1px solid ${isPending ? '#eaeaea' : '#e6f3ef'}`,
      }}
    >
      {isPending && (
        <motion.div
          animate={controls}
          style={{
            width: 14,
            height: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transformOrigin: 'center',
            opacity: 0.7,
          }}
        >
          <AiOutlineOpenAI size={14} />
        </motion.div>
      )}
      <span style={{ lineHeight: '1.4' }}>
        {isPending
          ? `Translating "${bubble.fieldLabel}" to ${localeSelect(
              bubble.locale
            ).name.toLowerCase()}`
          : `Translated "${bubble.fieldLabel}" to ${localeSelect(
              bubble.locale
            ).name.toLowerCase()}`}
      </span>
    </motion.div>
  );
};
