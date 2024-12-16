//********************************************************************************************
// SettingsSection.tsx
//
// A simple layout component that groups related settings under a titled section.
// This helps maintain a clear and consistent layout in the advanced settings page.
//
// Props:
// - title: The title of the section
// - children: The form elements or components belonging to this section
//
// The component:
// - Renders a heading and then the children below it.
//
//********************************************************************************************

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div
      style={{
        marginBottom: '24px',
        borderBottom: '1px solid #ccc',
        paddingBottom: '24px',
      }}
    >
      <h2
        style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '12px' }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
