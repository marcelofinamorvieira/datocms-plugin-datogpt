//********************************************************************************************
// DropdownSetting.tsx
//
// This component provides a labeled dropdown for selecting a single value from a set of options.
// It's used in the advanced settings page to configure settings like block generation depth.
//
// Props:
// - label: The label describing this setting
// - selectedValue: The currently selected value
// - options: An array of strings to choose from
// - onSelect: Callback when the user selects a new value
//
// The component:
// - Displays a label
// - Renders a simple dropdown using native <select> for simplicity
// - Calls onSelect when the user picks a new option
//
//********************************************************************************************

type DropdownSettingProps = {
  label: string;
  selectedValue: string;
  options: string[];
  onSelect: (val: string) => void;
};

export function DropdownSetting({
  label,
  selectedValue,
  options,
  onSelect,
}: DropdownSettingProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label
        style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
      >
        {label}
      </label>
      <select
        style={{
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
        }}
        value={selectedValue}
        onChange={(e) => onSelect(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
