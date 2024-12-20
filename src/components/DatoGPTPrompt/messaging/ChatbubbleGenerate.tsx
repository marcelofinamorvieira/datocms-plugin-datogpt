//********************************************************************************************
// ChatbubbleGenerate.tsx
//
// This component renders a single chat bubble representing the status of generating or improving fields
// from the "Generate all fields" or "Improve all fields" action in the sidebar.
//
// Props:
// - bubble: { fieldLabel: string; status: 'pending'|'done'; fieldPath: string; isImprove: boolean }
//   isImprove: indicates if we are improving existing values (true) or generating new values (false).
// - theme: Current theme provided by DatoCMS context for styling.
// - index: The index of this bubble in the list.
//
// Behavior:
// - If status is 'pending', display a spinning OpenAI icon and a message indicating "Generating..." or "Improving...".
// - If status is 'done', display a static icon and a completed message.
// - The text changes based on isImprove:
//   - If isImprove = false: "Generating {fieldLabel}..."/"Generated {fieldLabel}"
//   - If isImprove = true: "Improving {fieldLabel}..."/"Improved {fieldLabel}"
//
//********************************************************************************************

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AiOutlineOpenAI } from 'react-icons/ai';
import { Theme } from 'datocms-plugin-sdk';

type BubbleType = {
  fieldLabel: string;
  status: 'pending' | 'done';
  fieldPath: string;
  isImprove: boolean;
};

type Props = {
  bubble: BubbleType;
  theme: Theme;
  index: number;
};

export function ChatbubbleGenerate({ bubble, theme }: Props) {
  // Determine styling based on theme and status
  const backgroundColor = useMemo(() => {
    if (bubble.status === 'pending') {
      return theme.lightColor || 'rgb(242, 226, 254)';
    }
    return theme.semiTransparentAccentColor || 'rgba(114, 0, 196, 0.08)';
  }, [theme, bubble.status]);

  const textColor = useMemo(() => {
    if (bubble.status === 'pending') {
      return theme.darkColor || 'rgb(32, 0, 56)';
    }
    return theme.accentColor || 'rgb(114, 0, 196)';
  }, [theme, bubble.status]);

  const statusStyle = useMemo(() => {
    return {
      fontWeight: 600,
      color: textColor,
    };
  }, [textColor]);

  // Variants for framer-motion to animate bubble appearance and transitions
  const bubbleVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  // Conditional icon animation:
  // If status is 'pending', rotate continuously. If 'done', no rotation.
  const iconAnimation =
    bubble.status === 'pending'
      ? {
          rotate: [0, 360],
          transition: {
            duration: 1,
            ease: 'linear',
            repeat: Infinity,
          },
        }
      : {
          rotate: 0,
          transition: { duration: 0.2 },
        };

  // Determine the text based on isImprove and status:
  let actionVerb = 'Generating';
  let actionVerbPast = 'Generated';

  if (bubble.isImprove) {
    actionVerb = 'Improving';
    actionVerbPast = 'Improved';
  }

  return (
    <AnimatePresence>
      <motion.div
        key={bubble.fieldLabel + (bubble.isImprove ? '_improve' : '_generate')}
        variants={bubbleVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor,
          color: textColor,
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '8px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          fontSize: '14px',
          lineHeight: '1.4',
          letterSpacing: '0.01em',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          cursor: 'pointer',
          border: `1px solid ${
            theme.semiTransparentAccentColor || 'rgba(114, 0, 196, 0.1)'
          }`,
        }}
      >
        {/* OpenAI icon with animation */}
        <motion.div
          style={{
            display: 'flex',
            color: textColor,
          }}
          animate={iconAnimation}
        >
          <AiOutlineOpenAI size={20} />
        </motion.div>

        {/* Display text message with enhanced formatting */}
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 500 }}>
            {bubble.status === 'pending' ? (
              <>
                <strong style={statusStyle}>
                  {actionVerb} {bubble.fieldLabel}...
                </strong>
              </>
            ) : (
              <>
                {actionVerbPast} {bubble.fieldLabel}
              </>
            )}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}