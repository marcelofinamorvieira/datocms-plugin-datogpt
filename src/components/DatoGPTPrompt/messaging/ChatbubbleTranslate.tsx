import React from 'react';
import locale from 'locale-codes';
import { AiOutlineOpenAI } from 'react-icons/ai';

type Bubble = {
  status: 'pending' | 'done';
  fieldLabel: string;
  locale: string;
  fieldPath: string;
};

type Theme = {
  accentColor: string;
  darkColor: string;
  lightColor: string;
  primaryColor: string;
  semiTransparentAccentColor: string;
};

type Props = {
  index: number;
  bubble: Bubble;
  theme: Theme;
};

export const ChatBubble: React.FC<Props> = ({
  bubble,
  theme,
}) => {
  const isPending = bubble.status === 'pending';
  const localeSelect = locale.getByTag;

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: isPending ? 'flex-start' : 'flex-end',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          borderRadius: '12px',
          padding: '12px 18px',
          fontSize: '14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          margin: '6px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid',
          maxWidth: '80%',
          background: isPending
            ? 'rgba(0, 0, 0, 0.03)'
            : theme.semiTransparentAccentColor,
          borderColor: isPending ? 'rgba(0, 0, 0, 0.1)' : theme.lightColor,
          color: isPending ? 'rgba(0, 0, 0, 0.6)' : theme.accentColor,
        }}
      >
        {isPending && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 14,
                height: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '4px',
              }}
            >
              <AiOutlineOpenAI size={14} />
            </div>
          </div>
        )}

        <span
          style={{
            lineHeight: '1.5',
            fontWeight: 450,
            letterSpacing: '0.01em',
          }}
        >
          {isPending ? (
            <>
              Translating{' '}
              <strong style={{ fontWeight: 600 }}>"{bubble.fieldLabel}"</strong>{' '}
              to{' '}
              <strong style={{ fontWeight: 600 }}>
                {localeSelect(bubble.locale).name.toLowerCase()}
              </strong>
            </>
          ) : (
            <>
              Translated{' '}
              <strong style={{ fontWeight: 600 }}>"{bubble.fieldLabel}"</strong>{' '}
              to{' '}
              <strong style={{ fontWeight: 600 }}>
                {localeSelect(bubble.locale).name.toLowerCase()}
              </strong>
            </>
          )}
        </span>
      </div>
    </div>
  );
};
