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
  onSelect: (value: string) => void;
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
        alignItems: 'center',
        gap: 12,
        marginBottom: '1rem',
      }}
    >
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
          {options.map((option) => (
            <DropdownOption key={option} onClick={() => onSelect(option)}>
              {option}
            </DropdownOption>
          ))}
        </DropdownMenu>
      </Dropdown>
      <div>{label}</div>
    </div>
  );
}
