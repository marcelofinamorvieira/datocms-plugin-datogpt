import React from 'react';

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}