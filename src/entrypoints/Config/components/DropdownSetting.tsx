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

import {
  Button,
  CaretDownIcon,
  CaretUpIcon,
  Dropdown,
  DropdownMenu,
  DropdownOption,
} from 'datocms-react-ui';

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
    <div
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'baseline',
      }}
    >
      <label
        style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
      >
        {label}
      </label>
      <Dropdown
        renderTrigger={({ open, onClick }) => (
          <Button
            onClick={onClick}
            rightIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
          >
            {selectedValue}
          </Button>
        )}
      >
        <DropdownMenu>
          {options.map((opt) => (
            <DropdownOption key={opt} onClick={() => onSelect(opt)}>
              {opt}
            </DropdownOption>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}
